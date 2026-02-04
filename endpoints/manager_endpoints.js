module.exports = function(RED)
{
    const ros2 = require("../ros2_interface_api/ros2_interface_api.js");

// -------------------- Helpers --------------------

    // @node-red/util/lib/util.js (same id used for nodes)
    function generateId() 
    {
        var bytes = [];
        for (var i=0;i<8;i++) 
        {
            bytes.push(Math.round(0xff*Math.random()).toString(16).padStart(2,'0'));
        }

        return bytes.join("");
    }

    function serialize_commands_message(dictionary)
    {
        let key_value_array = []
        
        for (const [key, value] of Object.entries(dictionary))
        {
            key_value_array.push({"key": key, "value": value})
        }

        return {"data": key_value_array};
    }

    function deserialize_command_message(key_value_array)
    {
        let dictionary = {}
        
        for ({key, value} of key_value_array.data)
        {
            dictionary[key] = value;
        }

        return dictionary;
    }

// -------------------- Endpoints --------------------

    RED.httpAdmin.get("/ros/manager/list_packages",
    async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        
        const request = {
            "message_type": "30",
            "manager_id": manager_id,
            "node_id": "id_" + node_id,
            "script_name": "list_packages",
        };

        const request_serial = serialize_commands_message(request);

        const response_serial = await ros2.call("commands", node_id, request_serial);
        
        const response = deserialize_command_message(response_serial)

        let packages_list = []
        for (const [key, value] of Object.entries(response))
        {
            if (Number.isInteger(Number(key)))
            {
                packages_list.push(value);
            }
        }

        res.json(packages_list);
    });

    RED.httpAdmin.get("/ros/manager/list_nodes",
    async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const selectedPackage = req.query.package;

        const request = {
            "message_type": "30",
            "manager_id": manager_id,
            "node_id": "id_" + node_id,
            "script_name": "list_nodes",
            "package_name": selectedPackage,
        };

        const request_serial = serialize_commands_message(request);

        const response_serial = await ros2.call("commands", node_id, request_serial);
        
        const response = deserialize_command_message(response_serial)

        let nodes_list = []
        for (const [key, value] of Object.entries(response))
        {
            if (Number.isInteger(Number(key)))
            {
                nodes_list.push(value);
            }
        }

        res.json(nodes_list);
    });

    RED.httpAdmin.get("/ros/manager/list_launch_files",
    async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const selectedPackage = req.query.package;

        const request = {
            "message_type": "30",
            "manager_id": manager_id,
            "node_id": "id_" + node_id,
            "script_name": "list_launch",
            "package_name": selectedPackage,
        };
        
        const request_serial = serialize_commands_message(request);
            
        const response_serial = await ros2.call("commands", node_id, request_serial);
        
        const response = deserialize_command_message(response_serial)

        let launch_file_list = []
        for (const [key, value] of Object.entries(response))
        {
            if (Number.isInteger(Number(key)))
            {
                launch_file_list.push(value);
            }
        }

        res.json(launch_file_list);
    });

    RED.httpAdmin.get("/ros/manager/get_launch_arguments",
    async function (req, res)
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const launch_file_path = req.query.launch_file_path;

        const request = {
            "message_type": "30",
            "manager_id": manager_id,
            "node_id": "id_" + node_id,
            "script_name": "get_launch_arg",
            "launch_file_path": launch_file_path,
        };
        
        const request_serial = serialize_commands_message(request);

        const response_serial = await ros2.call("commands", node_id, request_serial);

        const response = deserialize_command_message(response_serial);

        let arguments_list = {}
        for (const [key, value] of Object.entries(response))
        {
            if (!["message_type", "manager_id", "node_id"].includes(key))
            {
                arguments_list[key] = value;
            }
        }

        res.json(arguments_list);
    });

    RED.httpAdmin.get("/ros/manager/get_full_launch_path", 
    async function (req, res)
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const package_name = req.query.package_name;
        const launch_file_name = req.query.launch_file_name;

        const request = {
            "message_type": "30",
            "manager_id": manager_id,
            "node_id": "id_" + node_id,
            "script_name": "get_full_launch_path",
            "package_name": package_name,
            "launch_file_name": launch_file_name,
        };
        
        const request_serial = serialize_commands_message(request);

        const response_serial = await ros2.call("commands", node_id, request_serial);
        
        const response = deserialize_command_message(response_serial)

        res.json(response["launch_path"]);
    });

    RED.httpAdmin.get("/ros/manager/get_file_content",
    async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const launch_file_path = req.query.launch_file_path;

        const request = {
            "message_type": "30",
            "manager_id": manager_id,
            "node_id": "id_" + node_id,
            "script_name": "get_file_content",
            "launch_file_path": launch_file_path,
        };
        
        const request_serial = serialize_commands_message(request);

        const response_serial = await ros2.call("commands", node_id, request_serial);
        
        const response = deserialize_command_message(response_serial)

        res.json(response["file_content"]);
    });
}
