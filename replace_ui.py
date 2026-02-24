import os
import re

replacements = {
    "Add Member": "Add Agent",
    "Add Members": "Add Agents",
    "Member Dashboard": "Agent Dashboard",
    "Members Dashboard": "Agents Dashboard",
    "All Members": "All Agents",
    "Assign Members": "Assign Agents",
    "Assign Member": "Assign Agent",
    "Members to Manager": "Agents to Manager",
    "-- Select Member --": "-- Select Agent --",
    "Select a Member": "Select an Agent",
    "Select Member": "Select Agent",
    ">Members<": ">Agents<",
    ">Member<": ">Agent<",
    "> Members <": "> Agents <",
    "> Member <": "> Agent <",
    ">Members <": ">Agents <",
    ">Member <": ">Agent <",
    "> Members<": "> Agents<",
    "> Member<": "> Agent<",
    "Total Members": "Total Agents",
    "Total Active Members": "Total Active Agents",
    "New Member": "New Agent",
    "/ Members": "/ Agents",
    "Filter by Member": "Filter by Agent",
    "Member Name": "Agent Name",
    "Member Email": "Agent Email",
    "Member Details": "Agent Details",
    "Member Logs": "Agent Logs",
    "Member ID": "Agent ID",
    "Back to Members": "Back to Agents",
    "Member data not available": "Agent data not available",
    "memberName || \"Member\"": "memberName || \"Agent\"",
    "name || \"Member\"": "name || \"Agent\"",
    "title=\"Members\"": "title=\"Agents\"",
    "title=\"Member\"": "title=\"Agent\"",
    "label=\"Members\"": "label=\"Agents\"",
    "label=\"Member\"": "label=\"Agent\"",
    "placeholder=\"Member ": "placeholder=\"Agent ",
    "placeholder=\"Members ": "placeholder=\"Agents ",
    "Member's Name": "Agent's Name",
    "Member's Email": "Agent's Email",
    "value=\"Member\"": "value=\"Agent\"", # Only if it's strictly a dropdown option label, but wait, value is sent to backend! We shouldn't change value="Member" if it goes to firestore! Remove this.
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content
    for old, new in replacements.items():
        new_content = new_content.replace(old, new)
        
    # Also handle some generic JSX text nodes like "\n    Members\n" -> split by lines and replace but stripped
    lines = new_content.split('\n')
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped == "Member":
            lines[i] = line.replace("Member", "Agent")
        elif stripped == "Members":
            lines[i] = line.replace("Members", "Agents")
        # Ensure we also replace string literals used purely for display like `{'Member'}` or `{"Member"}`
        # We need regex to find cases like >{"Member"}< or >{'Member'}<
        
    new_content = '\n'.join(lines)
    
    # regex for >{"Member"}< or >{'Member'}<
    new_content = re.sub(r'>\{\s*[\'"]Member[\'"]\s*\}<', '>{ "Agent" }<', new_content)
    new_content = re.sub(r'>\{\s*[\'"]Members[\'"]\s*\}<', '>{ "Agents" }<', new_content)
    
    # string interpolations or placeholders like placeholder="Enter Member details"
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.js') or file.endswith('.jsx'):
            process_file(os.path.join(root, file))

print("UI substitution complete.")
