import json
from ros2cli.node.strategy import NodeStrategy
from ros2topic.api import get_topic_names_and_types

with NodeStrategy(None) as node:
    topic_names_and_types = get_topic_names_and_types(node=node, include_hidden_topics=False)
    
    result = {}
    for (topic_name, topic_types) in topic_names_and_types:
        result[topic_name] = topic_types[0]

    print(json.dumps(result))
