/**
 * @file ros-subscriber.js
 * @author Daniel Onderka (xonder05)
 * @date 10/2025, 01/2026
 */

module.exports = function(RED) 
{
    const ros2 = require("ros2_interface_api");
    const ansi_to_html = require("ansi-to-html");

    function ROSSubscriber(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        function init()
        {
            // slice only the node id without subflows
            node.node_id = node.id.slice(node.id.lastIndexOf("-") + 1)

            node.terminal_output = [];
            node.terminal_output_msg_num = 0;
            node.terminal_output_converter = new ansi_to_html();

            ros2.state.on("change", interface_state_change_handler);

            node.on("close", close_event_handler);
        }

        async function interface_state_change_handler(state)
        {
            if (state == "inactive")
            {
                node.state = {fill: "grey", shape: "ring", text: "Interface offline"};
                node.status(node.state);
            }
            else
            {
                try
                {
                    node.subscriber = await ros2.subscribe_topic(
                        node.id, config.topic_name, config.package_name + "/" + config.type_name, terminal_output_callback
                    );
                
                    node.state = {fill: "green", shape: "dot", text: "Subscribed"} 
                    node.status(node.state);
                } 
                catch (error) 
                {
                    node.state = {fill: "red", shape: "dot", text: "Error, failed to subscribe"} 
                    node.status(node.state);   
                }
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

        async function close_event_handler(removed, done)
        {
            if (["green"].includes(node.state.fill)) 
            {
                try 
                {
                    await node.subscriber.destroy(node.id);

                    node.state = {fill: "grey", shape: "dot", text: "Unsubscribed"};
                    node.status(node.state);
                } 
                catch (error) {
                    // todo handle
                }
            }

            if (["grey", "red"].includes(node.state.fill)) {
                done();
            }
        }

        init();
    }

    RED.nodes.registerType("ros-subscriber", ROSSubscriber);
}
