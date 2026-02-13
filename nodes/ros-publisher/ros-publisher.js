/**
 * @file ros-publisher.js
 * @author Daniel Onderka (xonder05)
 * @date 01/2026
 */

module.exports = function(RED) 
{
    const ros2 = require("../../ros2_interface_api/ros2_interface_api.js");

    function ROSPublisher(config) 
    {
        RED.nodes.createNode(this,config);
        const node = this;

        function init()
        {
            // slice only the node id without subflows
            node.node_id = node.id.slice(node.id.lastIndexOf("-") + 1)

            ros2.state.on("change", interface_state_change_handler);

            node.on("input", input_event_handler);
            node.on("close", close_event_handler.bind(this));
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
                    node.publisher = await ros2.advertise_topic(node.id, config.topic, config.package + "/" + config.interface);
                
                    node.state = {fill: "green", shape: "dot", text: "Advertised"} 
                    node.status(node.state);
                } 
                catch (error) 
                {
                    node.state = {fill: "red", shape: "dot", text: "Error, failed to advertise"} 
                    node.status(node.state);   
                }
            }
        }

        async function input_event_handler(msg, send, done)
        {
            ros2.publish(config.topic, msg.payload);
            done();
        }

        async function close_event_handler(removed, done)
        {
            if (["green"].includes(node.state.fill)) 
            {
                try
                {
                    await node.publisher.destroy(node.id);

                    node.state = {fill: "grey", shape: "dot", text: "Unadvertised"};
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

    RED.nodes.registerType("ros-publisher", ROSPublisher);
}
