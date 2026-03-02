/**
 * @file ros-interface.js
 * @brief This node commands ROS2 interface and presents its state to user.
 * @author Daniel Onderka (xonder05)
 * @date 01/2026
 */

module.exports = function(RED) 
{
    const ros2 = require("ros2_interface_api");

    function ROSInterface(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        function init()
        {
            if (config.start == "deploy") {
                RED.events.once("flows:started", ros2.launch);
            }

            ros2.state.on("change", interface_state_change_handler);

            node.on("input", input_event_handler);
            node.on("close", close_event_handler);
        }

        async function interface_state_change_handler(state)
        {
            if (state == "inactive")
            {
                node.state = {fill: "grey", shape: "ring", text: "Offline"};
                node.status(node.state);
            }
            else
            {
                node.state = {fill: "green", shape: "dot", text: "Online"};
                node.status(node.state);
            }
        }

        function input_event_handler(msg, send, done)
        {
            if (msg.payload == "start") {
                if (ros2.state.get() == "inactive") {
                    ros2.launch();
                }
            }
            
            if (msg.payload == "stop") {
                if (ros2.state.get() == "active") {
                    ros2.stop();
                }
            }

            done();
        }

        async function close_event_handler(removed, done)
        {
            if (["green", "yellow"].includes(node.state.fill))
            {
                ros2.stop();
            }

            if (["grey", "red"].includes(node.state.fill))
            {
                done();
            }
        }

        init();
    };

    RED.nodes.registerType("ros-interface", ROSInterface);
}
