import sys, json
from rosidl_runtime_py import get_message_interfaces

package_name = sys.argv[1]

message_interfaces = get_message_interfaces([package_name])[package_name]
interfaces = [interface[4:] for interface in message_interfaces]

print(json.dumps(interfaces))
