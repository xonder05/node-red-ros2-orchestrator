/**
 * @file manager-config.js
 * @author Daniel Onderka (xonder05)
 * @date 06/2025
 */

module.exports = function(RED) 
{
    const ros2 = require("ros2_interface_api");

    function ManagerConfig(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        function init()
        {  
            node.manager_id = config.manager_id;

            ros2.state.on("change", interface_state_change_handler);

            node.on("close", close_event_handler);
        }

        async function interface_state_change_handler(state)
        {
            if (state == "inactive") {
                return;
            }

            try 
            {
                const service_name = `/management/commands/${node.manager_id}`;
                const message_type = "node_manager/DictionarySerialized";
                const qos = {
                    history: {
                        kind: "KEEP_LAST",
                        depth: 10
                    },
                    reliability: "RELIABLE",
                    durability: "VOLATILE"
                };

                node.client = await ros2.consume_service(node.id, service_name, message_type, qos)
            }
            catch (error) 
            {
                // todo inform someone, who?
            }
        }

        async function close_event_handler(removed, done)
        {
            if (ros2.state.current_state == "active")
            {
                try {
                    await node.client.destroy(node.node_id);
                } 
                catch (error) {
                    // todo                    
                }
            }

            done();
        }

        init();
    }

    RED.nodes.registerType("manager-config", ManagerConfig);
}
