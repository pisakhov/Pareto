from langchain.agents import create_agent
from ai.llm_model import model
from ai.toolbox import tools
from ai.prompts import SYSTEM_PROMPT

# Create the agent
# create_agent creates a graph that manages the conversation state and tool execution
pareto_agent = create_agent(model, tools, system_prompt=SYSTEM_PROMPT)

def invoke_agent(messages):
    """
    Invoke the agent with a list of messages and return the final state (messages).
    """
    state = pareto_agent.invoke({"messages": messages})
    return state["messages"]
