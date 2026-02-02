module.exports = function(RED)
{
    const ros2 = require("./ros2_interface_api/ros2_interface_api.js");

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

    function create_deferred_promise()
    {
        let resolve, reject;
        const promise = new Promise((res, rej) => {resolve = res; reject = rej;});
        return {promise, resolve, reject}
    }

    function wait_for_message(topic, node_id, message_type, timeout_sec)
    {
        event_emitter = ros2.get_event_emitter();
        const deferred_promise = create_deferred_promise()

        function event_handler(msg)
        {
            let res = {}
            for ({key, value} of msg.msg.data)
            {
                res[key] = value;
            }

            const id = res["node_id"].slice(3); // remove "id_" from the start
            
            // message for someone else
            if(id != node_id) 
            {
                console.log("Received command message for someone else, ignoring");
                return;
            }

            // only interested in response messages

            if(res["message_type"] != message_type) 
            {
                console.log("Received message that is not response, ignoring");
                return;
            }

            deferred_promise.resolve(res);  
            event_emitter.off(topic, event_handler);
        }

        event_emitter.on(topic, event_handler)
        return deferred_promise;
    }

    RED.httpAdmin.get("/ros/list_packages", RED.auth.needsPermission("ros-node.read"), async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 

        const msg = {
            data: [
                {key: "message_type", value: "30"},
                {key: "manager_id", value: manager_id},
                {key: "node_id", value: "id_" + node_id},
                {key: "script_name", value: "list_packages"},
            ]
        };
        
        ros2.publish("management/commands", msg);

        const deferred_promise = wait_for_message("management/commands", node_id, 90);
        const response = await deferred_promise.promise;

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

    RED.httpAdmin.get("/ros/list_nodes", RED.auth.needsPermission("ros-node.read"), async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const selectedPackage = req.query.package;

        const msg = {
            data: [
                {key: "message_type", value: "30"},
                {key: "manager_id", value: manager_id},
                {key: "node_id", value: "id_" + node_id},
                {key: "script_name", value: "list_nodes"},
                {key: "package_name", value: selectedPackage},
            ]
        };
            
        ros2.publish("management/commands", msg);

        const deferred_promise = wait_for_message("management/commands", node_id, 90);
        const response = await deferred_promise.promise;

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

    if(!global.log_setup_complete)
    {
        global.log_setup_complete = true;

        RED.httpAdmin.get("/get_log", RED.auth.needsPermission("ros-launch.read"), function (req, res) 
        {
            const node = RED.nodes.getNode(req.query.id);

            if (node) {
                res.send(node.log);
            }
            else {
                res.status(404).json({ error: "Node not found" });
            }
        });
    }

    RED.httpAdmin.get("/ros/list_launch_files", RED.auth.needsPermission("ros-launch.read"), async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const selectedPackage = req.query.package;

        const msg = {
            data: [
                {key: "message_type", value: "30"},
                {key: "manager_id", value: manager_id},
                {key: "node_id", value: "id_" + node_id},
                {key: "script_name", value: "list_launch"},
                {key: "package_name", value: selectedPackage},
            ]
        };
            
        ros2.publish("management/commands", msg);

        const deferred_promise = wait_for_message("management/commands", node_id, 90);
        const response = await deferred_promise.promise;

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

    RED.httpAdmin.get("/ros/get_launch_arguments", RED.auth.needsPermission("ros-launch.read"), async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const launch_file_path = req.query.launch_file_path;

        const msg = {
            data: [
                {key: "message_type", value: "30"},
                {key: "manager_id", value: manager_id},
                {key: "node_id", value: "id_" + node_id},
                {key: "script_name", value: "get_launch_arg"},
                {key: "launch_file_path", value: launch_file_path},
            ]
        };
        
        ros2.publish("management/commands", msg);

        const deferred_promise = wait_for_message("management/commands", node_id, 90);
        const response = await deferred_promise.promise;

        console.log(response)

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

    RED.httpAdmin.get("/ros/get_full_launch_path", RED.auth.needsPermission("ros-launch.read"), async function (req, res) 
    {
        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const package_name = req.query.package_name;
        const launch_file_name = req.query.launch_file_name;

        const msg = {
            data: [
                {key: "message_type", value: "30"},
                {key: "manager_id", value: manager_id},
                {key: "node_id", value: "id_" + node_id},
                {key: "script_name", value: "get_full_launch_path"},
                {key: "package_name", value: package_name},
                {key: "launch_file_name", value: launch_file_name},
            ]
        };
            
        ros2.publish("management/commands", msg);

        const deferred_promise = wait_for_message("management/commands", node_id, 90);
        const response = await deferred_promise.promise;

        res.json(response["launch_path"]);
    });

    RED.httpAdmin.get("/ros/get_file_content", RED.auth.needsPermission("ros-launch.read"), async function (req, res) 
    {

        const manager_id = req.query.manager_id;
        const node_id = generateId(); 
        const launch_file_path = req.query.launch_file_path;

        const msg = {
            data: [
                {key: "message_type", value: "30"},
                {key: "manager_id", value: manager_id},
                {key: "node_id", value: "id_" + node_id},
                {key: "script_name", value: "get_file_content"},
                {key: "launch_file_path", value: launch_file_path},
            ]
        };
        
        ros2.publish("management/commands", msg);

        const deferred_promise = wait_for_message("management/commands", node_id, 90);
        const response = await deferred_promise.promise;

        console.log(response)

        res.json(response["file_content"]);
    });

}
