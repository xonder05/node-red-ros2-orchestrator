/**
 * @file ros-node.js
 * @author Daniel Onderka (xonder05)
 * @date 10/2025
 */

module.exports = function(RED) 
{
    const ros2 = require("../../ros2_interface_api/ros2_interface_api.js");
    const ansi_to_html = require("ansi-to-html");

    function ROSNode(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        function init()
        {
            // slice only the node id without subflows
            node.node_id = node.id.slice(node.id.lastIndexOf('-') + 1)

            node.terminal_output = [];
            node.terminal_output_msg_num = 0;
            node.terminal_output_converter = new ansi_to_html();

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
            node.on("close", close_event_handler);
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
                message_type: "10", 
                manager_id: node.manager_config.manager_id,
                node_id: "id_" + node.node_id,
                package_name: config.package_name, 
                node_name: config.node_name,
                runtime_node_name: config.runtime_node_name,
                namespace: config.namespace,
            };

            for (const [key, value] of Object.entries(config.params))
            {
                request["param_" + key] = value;
            }

            for (const [key, value] of Object.entries(config.remaps))
            {
                request["remap_" + key] = value;
            }

            // communication
            const request_serialized = serialize_commands_message(request)

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
                    node.stdout_subscriber = await ros2.subscribe_topic(
                        node.node_id, `management/stdout/id_${node.node_id}`, "std_msgs/String", terminal_output_callback, []
                    );
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
                message_type: "50",
                manager_id: node.manager_config.manager_id,
                node_id: "id_" + node.node_id,
                package_name: config.package_name, 
                node_name: config.node_name, 
            };

            //communication
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

        function terminal_output_callback(msg)
        {
            // parse message
            const ros_msg = msg.payload;
            const raw_string = ros_msg.data;

            // convert
            const one_line = raw_string.replace("/\n/g", "");
            const ansi_line = `<div id="msg_${node.terminal_output_msg_num++}">${one_line}</div>`;
            const html_line = node.terminal_output_converter.toHtml(ansi_line);
            node.terminal_output.push(html_line);

            // send new data to Editor sidebar
            RED.comms.publish("terminal_output", {
                node_id: node.id,
                terminal_output: html_line,
            }, true);

            // send new data to node output
            node.send([null, {payload: html_line}])

            // limit history to 1000 lines
            if (node.terminal_output.length > 1000) {
                node.terminal_output = node.terminal_output.slice(1);
            }
        }

        init();
    };

    RED.nodes.registerType("ros-node", ROSNode);
}
