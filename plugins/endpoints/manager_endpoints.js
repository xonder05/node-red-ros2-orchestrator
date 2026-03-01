/**
 * @file manager_endpoints.js
 * @author Daniel Onderka (xonder05)
 * @date 01/2026
 * 
 * This file contains endpoints that frontend (Node-RED Editor) can call to get data.
 * Most significant nodes using these endpoints are ros-node and ros-launch.
 * The keyword "manager" implies that all data these endpoints provide come from NodeManagers running on robots and stationary devices.
 */

module.exports = function(RED) 
{
    const ros2 = require("ros2_interface_api");

    RED.plugins.registerPlugin("manager_endpoints", { onadd: function() 
    {
        // -------------------- Helpers --------------------

        // id generator lent from @node-red/util/lib/util.js
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
            try 
            {
                // check
                if (ros2.state.get() == "inactive") {
                    throw Error("ROS2 interface inactive");
                }

                // build request
                const node_id = generateId(); 
                const manager_id = req.query.manager_id;
                
                const request = {
                    "message_type": "30",
                    "node_id": "id_" + node_id,
                    "manager_id": manager_id,
                    "script_name": "list_packages",
                };

                // communication
                const request_serial = serialize_commands_message(request);

                const response_serial = await ros2.call(node_id, "commands", request_serial);

                const response = deserialize_command_message(response_serial);

                // handle response
                let packages_list = [];

                if (response["return_value"] == "3")
                {
                    for (const [key, value] of Object.entries(response))
                    {
                        if (Number.isInteger(Number(key)))
                        {
                            packages_list.push(value);
                        }
                    }
                }

                res.status(200).json(packages_list);
            } 
            catch (error) 
            {
                res.status(500).json({state: "inactive"});
            }
        });

        RED.httpAdmin.get("/ros/manager/list_nodes",
        async function (req, res) 
        {
            try 
            {
                // check
                if (ros2.state.get() == "inactive") {
                    throw Error("ROS2 interface is inactive");
                }

                // build request
                const node_id = generateId(); 
                const manager_id = req.query.manager_id;
                const package_name = req.query.package_name;

                const request = {
                    "message_type": "30",
                    "node_id": "id_" + node_id,
                    "manager_id": manager_id,
                    "script_name": "list_nodes",
                    "package_name": package_name,
                };

                // communication
                const request_serial = serialize_commands_message(request);

                const response_serial = await ros2.call(node_id, "commands", request_serial);
                
                const response = deserialize_command_message(response_serial);

                // handle response
                let nodes_list = [];

                if (response["return_value"] == "3")
                {
                    for (const [key, value] of Object.entries(response))
                    {
                        if (Number.isInteger(Number(key)))
                        {
                            nodes_list.push(value);
                        }
                    }
                }

                res.status(200).json(nodes_list);
            }
            catch (error) 
            {
                res.status(500).json({state: "inactive"});
            }
        });

        RED.httpAdmin.get("/ros/manager/list_launch_files",
        async function (req, res) 
        {
            try 
            {
                // check
                if (ros2.state.get() == "inactive") {
                    throw Error("ROS2 interface inactive");
                }

                // build request
                const node_id = generateId(); 
                const manager_id = req.query.manager_id;
                const package_name = req.query.package_name;

                const request = {
                    "message_type": "30",
                    "node_id": "id_" + node_id,
                    "manager_id": manager_id,
                    "script_name": "list_launch_files",
                    "package_name": package_name,
                };
                
                // communication
                const request_serial = serialize_commands_message(request);
                    
                const response_serial = await ros2.call(node_id, "commands", request_serial);
                
                const response = deserialize_command_message(response_serial)

                // handle response
                let launch_file_list = []

                if (response["return_value"] == "3")
                {
                    for (const [key, value] of Object.entries(response))
                    {
                        if (Number.isInteger(Number(key)))
                        {
                            launch_file_list.push(value);
                        }
                    }
                }

                res.status(200).json(launch_file_list);
            }
            catch (error) 
            {
                res.status(500).json({state: "inactive"});
            }
        });

        RED.httpAdmin.get("/ros/manager/list_config_files",
        async function (req, res) 
        {
            try 
            {
                // check
                if (ros2.state.get() == "inactive") {
                    throw Error("ROS2 interface inactive");
                }

                // build request
                const node_id = generateId(); 
                const manager_id = req.query.manager_id;
                const package_name = req.query.package_name;

                const request = {
                    "message_type": "30",
                    "node_id": "id_" + node_id,
                    "manager_id": manager_id,
                    "script_name": "list_config_files",
                    "package_name": package_name,
                };
                
                // communication
                const request_serial = serialize_commands_message(request);
                    
                const response_serial = await ros2.call(node_id, "commands", request_serial);
                
                const response = deserialize_command_message(response_serial)

                // handle response
                let launch_file_list = []

                if (response["return_value"] == "3")
                {
                    for (const [key, value] of Object.entries(response))
                    {
                        if (Number.isInteger(Number(key)))
                        {
                            launch_file_list.push(value);
                        }
                    }
                }

                res.status(200).json(launch_file_list);
            }
            catch (error) 
            {
                res.status(500).json({state: "inactive"});
            }
        });

        RED.httpAdmin.get("/ros/manager/list_launch_arguments",
        async function (req, res)
        {
            try
            {
                // check
                if (ros2.state.get() == "inactive") {
                    throw Error("ROS2 interface inactive");
                }

                // build request
                const node_id = generateId(); 
                const manager_id = req.query.manager_id;
                const package_name = req.query.package_name;
                const launch_file_name = req.query.launch_file_name;

                const request = {
                    "message_type": "30",
                    "node_id": "id_" + node_id,
                    "manager_id": manager_id,
                    "script_name": "list_launch_arguments",
                    "package_name": package_name,
                    "file_name": launch_file_name,
                };
                
                // communication
                const request_serial = serialize_commands_message(request);

                const response_serial = await ros2.call(node_id, "commands", request_serial);

                const response = deserialize_command_message(response_serial);

                // handle response
                let arguments_list = {}

                if (response["return_value"] == "3")
                {
                    for (const [key, value] of Object.entries(response))
                    {
                        if (!["message_type", "manager_id", "node_id", "return_value"].includes(key))
                        {
                            arguments_list[key] = value;
                        }
                    }
                }

                res.status(200).json(arguments_list);    
            } 
            catch (error) 
            {
                res.status(500).json({state: "inactive"});
            }
        });

        RED.httpAdmin.get("/ros/manager/read_file", 
        async function (req, res)
        {
            try 
            {
                if (ros2.state.get() == "inactive") {
                    throw Error("ROS2 interface inactive");
                }

                // build request
                const node_id = generateId(); 
                const manager_id = req.query.manager_id;
                const package_name = req.query.package_name;
                const file_name = req.query.file_name;

                const request = {
                    "message_type": "40",
                    "manager_id": manager_id,
                    "node_id": "id_" + node_id,
                    "script_name": "resolve_file_path",
                    "package_name": package_name,
                    "file_name": file_name,
                };
                
                // communication
                const request_serial = serialize_commands_message(request);

                const response_serial = await ros2.call(node_id, "commands", request_serial);
                
                const response = deserialize_command_message(response_serial)

                // handle response
                if (response["return_value"] == "4")
                {
                    res.status(200).json(response["file_content"]);   
                }
                else
                {
                    res.status(200).json("");   
                }

            } 
            catch (error) 
            {
                res.status(500).json({state: "inactive"});
            }
        });

        RED.httpAdmin.get("/ros/manager/write_file", 
        async function (req, res)
        {
            try 
            {
                // check
                if (ros2.state.get() == "inactive") {
                    throw Error("ROS2 interface inactive");
                }
            
                // build request
                const node_id = generateId(); 
                const manager_id = req.query.manager_id;
                const package_name = req.query.package_name;
                const file_name = req.query.file_name;
                const file_content = req.query.file_content;

                const request = {
                    "message_type": "41",
                    "node_id": "id_" + node_id,
                    "manager_id": manager_id,
                    "script_name": "resolve_file_path",
                    "package_name": package_name,
                    "file_name": file_name,
                    "file_content": file_content, 
                };
                
                // communication
                const request_serial = serialize_commands_message(request);

                const response_serial = await ros2.call(node_id, "commands", request_serial);

                const response = deserialize_command_message(response_serial)

                // handle response
                res.status(200).json(response["return_value"]);   
            } 
            catch (error)
            {
                res.status(500).json({state: "inactive"});
            }
        });
    }});
}
