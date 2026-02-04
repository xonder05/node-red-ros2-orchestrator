/**
 * @file ros-launch.js
 * @author Daniel Onderka (xonder05)
 * @date 10/2025
 */

module.exports = function(RED) 
{
    const is_web_api = require("is-web-api");
    const events = require('events');

    function ROSLaunch(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        function init()
        {
            // slice only the node id without subflows
            node.node_id = node.id.slice(node.id.lastIndexOf("-") + 1)
            node.log = "";

            // get corresponding manager config from enviroment
            node.manager_config = RED.nodes.getNode(config.manager);

            node.state = {fill: "grey", shape: "dot", text: "Offline"};
            node.status(node.state);

            register_is();
            RED.events.once("flows:started", flow_started_event_handler.bind(this))

            node.event_emitter = new events.EventEmitter();
            node.on("input", input_event_handler);

            node.on("close", close_event_handler.bind(this));
            RED.events.once("flows:stopped", flow_stopped_event_handler);
        }

        function close_event_handler(removed, done)
        {
            if (done) {
                node.done = done;
            }

            // node running, stop it
            if (["green"].includes(node.state.fill))
            {
                node.closing = true;
                stop_node();
            }

            // last handler call, proper cleanup
            if (["grey", "blue", "red"].includes(node.state.fill))
            {
                unregister_is();
                node.done();
            }
        }

        function start_node()
        {
            console.log(config.launch_args)

            const msg = {
                message_type: "20",
                manager_id: node.manager_config.manager_id,
                node_id: "id_" + node.node_id,
                data: [
                    {key: "package_name", value: config.package},
                    {key: "node_name",    value: config.launch_name},
                    ...Object.entries(config.launch_args).map( ([k, v]) => {
                        return {key: "arg_" + k, value: v}
                    })
                ]
            };
            
            if (!is_web_api.send_message("management/commands", msg))
            {
                node.state = {fill: "yellow", shape: "dot", text: "Calling launch file"}
                node.status(node.state);

                setTimeout(() => {
                    if (node.state.fill == "yellow")
                    {
                        node.state = {fill: "red", shape: "dot", text: "Backend didn't respond"}
                        node.status(node.state);
                    }
                }, 5000);
            }
            else
            {
                // todo fix this
                node.state = {fill: "blue", shape: "dot", text: "Waiting for Integration Service"}
                node.status(node.state);

                setTimeout(() => {
                    flow_started_event_handler();
                }, 1000);
            }

            node.event_emitter.on("", (res) => 
            {
                // set node status based on the return value
                if([1, 11].includes(res.return_value))
                {
                    node.state = {fill: "green", shape: "dot", text: "Running"} 
                    node.status(node.state);
                }
                else
                {
                    node.state = {fill: "red", shape: "dot", text: ("Error: " + res.return_value)}
                    node.status(node.state);
                }
            })
        }

        function stop_node()
        {
            const msg = {
                message_type: 50,
                manager_id: node.manager_config.manager_id,
                node_id: "id_" + node.node_id,
                data: [
                    {package_name: config.package},
                    {node_name: config.launch_name},
                ]
            };

            if (!is_web_api.send_message("management/commands", msg))
            {
                node.state = {fill: "yellow", shape: "dot", text: "Stopping launch file"}
                node.status(node.state);
            }
            else
            {
                node.state = {fill: "yellow", shape: "dot", text: "Waiting for Integration Service"}
                node.status(node.state);
            }

            node.event_emitter.once("", (res) => 
            {
                clearTimeout(node.stop_node_timeout)

                // success return code
                if([5, 15].includes(res.return_value))
                {
                    node.state = {fill: "grey", shape: "dot", text: "Offline"} 
                    node.status(node.state);

                    if (node.closing) {
                        close_event_handler()
                    }
                }
                else
                {
                    node.state = {fill: "red", shape: "dot", text: "Could not stop node, todo ret code"}
                    node.status(node.state);
                }
            })

            node.stop_node_timeout = setTimeout(() => {
                if (node.state.fill != "grey")
                {
                    node.state = {fill: "red", shape: "dot", text: "Backend didn't respond"}
                    node.status(node.state);
                }
            }, 5000);

        }

        function flow_started_event_handler()
        {
            is_web_api.launch();
            setTimeout(start_node, 1000);
        }

        function flow_stopped_event_handler()
        {
            is_web_api.launch();
        }

        function register_is()
        {
            // join commands topic
            const interface_path = get_interface_path("node_manager", "NodeManagerCommand");
            const folder_path = interface_path.slice(0, interface_path.lastIndexOf("/"));
            is_web_api.add_custom_ros2_type("node_manager", "NodeManagerCommand", folder_path);

            const topic_name = "management/commands";
            const message_type = "node_manager/NodeManagerCommand";
            const qos = {
                history: {
                    kind: "KEEP_LAST",
                    depth: 10
                },
                reliability: "RELIABLE",
                durability: "VOLATILE"
            };

            is_web_api.add_publisher(topic_name, message_type, qos);
            is_web_api.add_subscriber(topic_name, message_type, qos);

            // join topic with node's stdout
            is_web_api.add_ros2_type("std_msgs", "String");
            is_web_api.add_subscriber(`management/stdout/id_${node.node_id}`, "std_msgs/String", []);

            const event_emitter = is_web_api.get_event_emitter();

            event_emitter.on("management/commands", commands_callback);
            event_emitter.on(`management/stdout/id_${node.node_id}`, log_callback);
        }

        function unregister_is()
        {
            // join commands topic
            const interface_path = get_interface_path("node_manager", "NodeManagerCommand");
            const folder_path = interface_path.slice(0, interface_path.lastIndexOf("/"));
            is_web_api.remove_custom_ros2_type("node_manager", "NodeManagerCommand", folder_path);

            const topic_name = "management/commands";
            is_web_api.remove_publisher(topic_name);
            is_web_api.remove_subscriber(topic_name);

            // join topic with node's stdout
            is_web_api.remove_ros2_type("std_msgs", "String");

            // subsribe
            is_web_api.remove_subscriber(`management/stdout/id_${node.node_id}`);

            event_emitter = is_web_api.get_event_emitter();

            event_emitter.off("management/commands", commands_callback);
            event_emitter.off(`management/stdout/id_${node.node_id}`, log_callback);
        }

        function commands_callback(msg)
        {
            const res = msg.msg;
            const id = res.node_id.slice(3); // remove "id_" from the start
            
            // message for someone else
            if(id != node.node_id) 
            {
                console.log("Recieved command message for someone else, ignoring");
                return;
            }

            // only interested in response messages
            if(res.message_type != 90) 
            {
                console.log("Recievent message that is not response, ignoring");
                return;
            }

            node.event_emitter.emit("", res);
        }

        function input_event_handler(msg, send, done)
        {
            if (msg.payload == true)
            {
                start_node()
            }
            
            if (msg.payload == false)
            {
                stop_node()
            }

            done();
        }

        function log_callback(msg)
        {
            node.log = node.log + msg.msg?.data + "\n";

            RED.comms.publish("log", {
                id: node.id,
                log: node.log,
            }, true);

            out = {
                payload: msg.msg?.data   
            }
            node.send([null, out])
        }

        init();
    };

    RED.nodes.registerType("ros-launch", ROSLaunch);

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
}