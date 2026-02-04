module.exports = function(RED)
{
    const child_process = require("child_process");

    RED.httpAdmin.get("/ros/local/list_packages",
    function (req, res) 
    {
        const cmd = `python3 -c "import json; from ament_index_python.packages import get_packages_with_prefixes; print(json.dumps(list(get_packages_with_prefixes().keys())))"`;

        child_process.exec(cmd, (error, stdout, stderr) => 
        {
            if (error) {
                console.error(`Exec error: ${error.message}`);
                return res.status(500).json({ error: "Python execution failed" });
            }

            try {
                const packages = JSON.parse(stdout);
                res.json(packages);
            }
            catch (err) {
                console.error("JSON parse error:", err);
                res.status(500).json({ error: "Invalid JSON output" });
            }
        });
    });

    RED.httpAdmin.get("/ros/local/list_interfaces", 
    function (req, res) 
    {
        const selectedPackage = req.query.package;

        const cmd = `python3 -c "import json; from rosidl_runtime_py import get_message_interfaces; print(json.dumps(get_message_interfaces(['${selectedPackage}'])['${selectedPackage}']))"`;

        child_process.exec(cmd, (error, stdout, stderr) => 
        {
            if (error) {
                console.error(`Exec error: ${error.message}`);
                return res.status(500).json({ error: "Python execution failed" });
            }

            try {
                const packages = JSON.parse(stdout);
                res.json(packages);
            } 
            catch (err) {
                console.error("JSON parse error:", err);
                res.status(500).json({ error: "Invalid JSON output" });
            }
        });
    });

}