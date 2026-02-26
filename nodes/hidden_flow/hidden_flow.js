/**
 * @file hidden_flow.js
 * @author Daniel Onderka (xonder05)
 * @date 02/2026
 */

module.exports = function(RED) 
{
    function HiddenFlow(config) 
    {
        RED.nodes.createNode(this, config);
    }

    RED.nodes.registerType("hidden_flow", HiddenFlow);
}
