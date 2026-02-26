/**
 * @file local_endpoints.js
 * @author Daniel Onderka (xonder05)
 * @date 01/2026
 * 
 * This file contains endpoints that frontend (Node-RED Editor) can call to get data.
 * Most significant nodes using these endpoints are ros-publisher and ros-subscriber.
 * The keyword "local" implies that all data these endpoints provide come from device running Node-RED backend (Runtime)  
 */

module.exports = function(RED)
{
    const child_process = require("child_process");

    RED.httpAdmin.get("/ros/local/terminal_output", 
    function (req, res) 
    {
        const node_id = req.query.node_id;
        const node = RED.nodes.getNode(node_id);

        if (node) {
            res.send(node.terminal_output);
        }
        else {
            res.status(404).json({ error: "Node not found" });
        }
    });

    RED.httpAdmin.get("/ros/local/list_topics",
    function (req, res) 
    {
        child_process.exec("python3 ./scripts/list_topics.py", 
        function (error, stdout, stderr)
        {
            try 
            {
                if (error) {
                    throw Error("Script execution failed");
                } 
                
                const topics_and_types = JSON.parse(stdout);
                res.status(200).json(topics_and_types);
            } 
            catch (error) 
            {
                res.status(500).json({error});
            }
        });
    });

    RED.httpAdmin.get("/ros/local/list_packages",
    function (req, res) 
    {
        child_process.exec("python3 ./scripts/list_packages.py", 
        function (error, stdout, stderr)
        {
            try 
            {
                if (error) {
                    throw Error("Script execution failed");
                }

                const packages = JSON.parse(stdout);
                res.status(200).json(packages);
            } 
            catch (error) 
            {
                res.status(500).json({error});
            }
        });
    });

    RED.httpAdmin.get("/ros/local/list_types", 
    function (req, res) 
    {
        const selected_package = req.query.package;

        child_process.exec(`python3 ./scripts/list_types.py ${selected_package}`, 
        function (error, stdout, stderr)
        {
            try 
            {
                if (error) {
                    throw Error("Script execution failed");
                }

                const interfaces = JSON.parse(stdout);
                res.status(200).json(interfaces);
            }
            catch (error) 
            {
                res.status(500).json({error});
            }
        });
    });
}