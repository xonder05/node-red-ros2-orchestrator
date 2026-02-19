/**
 * @file ros-subscriber.js
 * @author Daniel Onderka (xonder05)
 * @date 10/2025, 01/2026
 */

module.exports = function(RED) 
{
    const ros2 = require("../../ros2_interface_api/ros2_interface_api.js");

    function ROSSubscriber(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        function init()
        {
            // slice only the node id without subflows
            node.node_id = node.id.slice(node.id.lastIndexOf("-") + 1)
            node.log = "";

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
                    node.subscriber = await ros2.subscribe_topic(node.id, config.topic_name, config.package_name + "/" + config.type_name, log_callback);
                
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

        function log_callback(msg)
        {
            node.log = node.log + msg.payload?.data + "\n";

            RED.comms.publish("log", {
                id: node.id,
                log: node.log,
            }, true);

            out = {
                payload: msg.payload?.data,
            }

            node.send(out)
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
