/**
 * @file ros-launch.js
 * @author Daniel Onderka (xonder05)
 * @date 10/2025
 */

module.exports = function(RED) 
{
    const ros2 = require("../../ros2_interface_api/ros2_interface_api.js");

    function ROSLaunch(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        function init()
        {
            // slice only the node id without subflows
            node.node_id = node.id.slice(node.id.lastIndexOf("-") + 1)
            node.log = "";

            // get corresponding manager config from environment
            node.manager_config = RED.nodes.getNode(config.manager);

            if (ros2.state.get() == "active")
            {
                node.state = {fill: "grey", shape: "dot", text: "Offline"};
                node.status(node.state);
            }
            else
            {
                node.state = {fill: "grey", shape: "ring", text: "ROS2 Interface is offline"};
                node.status(node.state);
            }

            node.on("input", input_event_handler);
            node.on("close", close_event_handler.bind(this));
        }

        async function input_event_handler(msg, send, done)
        {
            if (msg.payload == "start") {
                await start_node()
            }
            
            if (msg.payload == "stop") {
                await stop_node()
            }

            done();
        }

        async function close_event_handler(removed, done)
        {
            node.closing = true;

            if (["green", "yellow"].includes(node.state.fill)) {
                await stop_node();
            }

            if (["grey", "red"].includes(node.state.fill)) {
                done();
            }
        }

        function serialize_commands_message(dictionary)
        {
            let key_value_array = []
            
            for (const [key, value] of Object.entries(dictionary))
            {
                key_value_array.push({ "key": key, "value": value })
            }

            return { "data": key_value_array };
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

        async function start_node()
        {
            // checks
            if (ros2.state.get() == "inactive")
            {
                node.state = {fill: "gray", shape: "ring", text: "ROS2 Interface is offline"}
                node.status(node.state);
                return;
            }

            node.state = {fill: "blue", shape: "dot", text: "Calling NodeManager"}
            node.status(node.state);

            // build message
            let request = {
                message_type: "20",
                manager_id: node.manager_config.manager_id,
                node_id: "id_" + node.node_id,
                package_name: config.package_name,
                node_name: config.launch_name,
            };

            for (const [key, value] of Object.entries(config.args))
            {
                request["arg_" + key] = value;
            }

            // communication
            const request_serialized = serialize_commands_message(request);
            
            let response_serialized;
            try {
                response_serialized = await ros2.call(node.node_id, "commands", request_serialized);
            }
            catch (error) {
                node.state = {fill: "red", shape: "dot", text: "Could not contact NodeManager"} 
                node.status(node.state);
                return;
            }

            const response = deserialize_command_message(response_serialized);

            // handle response
            if(["1", "11"].includes(response.return_value))
            {
                node.state = {fill: "green", shape: "dot", text: "Running"} 
                node.status(node.state);

                try {
                    node.stdout_subscriber = await ros2.subscribe_topic(node.node_id, `management/stdout/id_${node.node_id}`, "std_msgs/String", log_callback, []);
                } 
                catch (error) {
                    node.state = {fill: "yellow", shape: "dot", text: "Running, no stdout"} 
                    node.status(node.state);
                }
            }
            else
            {
                node.state = {fill: "red", shape: "dot", text: (`NodeManager Error (Code: ${response.return_value})`)}
                node.status(node.state);
            }
        }

        async function stop_node()
        {
            // check
            if (ros2.state.get() == "inactive")
            {
                node.state = {fill: "gray", shape: "ring", text: "ROS2 Interface is offline"}
                node.status(node.state);
                return;
            }

            node.state = {fill: "blue", shape: "dot", text: "Calling NodeManager"}
            node.status(node.state);

            // build message
            const request = {
                message_type: 50,
                manager_id: node.manager_config.manager_id,
                node_id: "id_" + node.node_id,
                package_name: config.package_name,
                node_name: config.launch_name,
            };

            // communication
            const request_serialized = serialize_commands_message(request);

            let response_serialized;
            try {
                response_serialized = await ros2.call(node.node_id, "commands", request_serialized);
            } 
            catch (error) {
                node.state = {fill: "red", shape: "dot", text: "Could not contact NodeManager"} 
                node.status(node.state);
                return;
            }

            const response = deserialize_command_message(response_serialized);

            // handle response
            if(["5", "15"].includes(response.return_value))
            {
                node.state = {fill: "grey", shape: "dot", text: "Offline"} 
                node.status(node.state);

                if (node.stdout_subscriber)
                {
                    try {
                        await node.stdout_subscriber.delete(node.node_id, `management/stdout/id_${node.node_id}`);
                    } 
                    catch (error) {
                        // todo i don't even know what to write here, find out how to recover from this
                    }
                }
            }
            else
            {
                node.state = {fill: "red", shape: "dot", text: (`NodeManager Error (Code: ${response.return_value})`)}
                node.status(node.state);
            }
        }

        function log_callback(msg)
        {
            node.log = node.log + msg.payload?.data + "\n";

            RED.comms.publish("log", {
                id: node.id,
                log: node.log,
            }, true);

            out = {
                payload: msg.payload?.data   
            }
            node.send([null, out])
        }

        init();
    };

    RED.nodes.registerType("ros-launch", ROSLaunch);
}
