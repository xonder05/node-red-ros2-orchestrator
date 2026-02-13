module.exports = function(RED) 
{
    function ManagerConfig(config) 
    {
        RED.nodes.createNode(this, config);
        const node = this;

        node.manager_name = config.manager_name;
        node.manager_id = config.manager_id;
    }

    RED.nodes.registerType("manager-config", ManagerConfig);
}
