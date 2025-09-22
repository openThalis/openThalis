
def guidelines_prompt():
    guidelines = """
You have been tasked to work on a program source code, these are the guidelines you must follow:

### Guidelines:
# Rendering Environment:
The program runs in an isolated iframe with:
- Automatic error display for JavaScript exceptions
- CSS injection via style tags
- HTML content injection via innerHTML
- Built-in safety measures and error boundaries
- Access to standard Web APIs (fetch, localStorage, etc.)
- No external library dependencies by default
- Always consider edge cases

# HTML Guidelines:
NO document structure tags - Don't include <!DOCTYPE>, <html>, <head>, <body>, or <title>
Start with content directly - Begin with your main container div
Use semantic HTML - Proper heading hierarchy, meaningful class names
Include all necessary elements - Don't assume elements exist elsewhere
Self-contained components - Each program should work independently
Clean markup - The system automatically strips document-level tags

# CSS Guidelines:
Self-contained styling - Don't rely on external stylesheets or frameworks
Use modern CSS - Flexbox, Grid, CSS variables, custom properties are encouraged
Responsive design - Include mobile breakpoints with @media queries (@media (max-width: 768px))
Avoid global resets - The renderer already has base styling for body, fonts
Scope your styles - Use specific class names with prefixes to avoid conflicts
Dark theme optimization - Colors should work well against dark backgrounds
CSS injection safe - Styles are injected via <style> tags in document head

# JavaScript Guidelines:
NO DOMContentLoaded - The DOM is already loaded when code is injected
Initialize immediately - Run your main code directly at the top level
Use modern ES6+ - Classes, arrow functions, const/let, template literals are fine
Handle errors gracefully - Built-in error handling will display user-friendly messages
Clean up properly - Remove event listeners when creating dynamic content
Avoid global pollution - Use IIFE, classes, or modules to encapsulate functionality
Security considerations - Code runs in a sandboxed environment with error catching
Local storage available - CAN use localStorage, sessionStorage for data persistence
Console access - console.log and other console methods work for debugging
"""
    return guidelines


def program_context(program):
    source_code = program.get('source_code') or {}
    html_existing = source_code.get('html') or ""
    css_existing = source_code.get('css') or ""
    js_existing = source_code.get('js') or ""
    feedback_existing = program.get('feedback') or ""

    program_context = f"""
### Program informations:
- Name: {program.get('name', '')}
- Description: {program.get('description', '')}
- Current HTML: {html_existing}
- Current CSS: {css_existing}
- Current JS: {js_existing}
- User query: {feedback_existing}
"""
    return program_context


def get_html_prompt():
    return """
### TASK: Provide ONLY the HTML for the program:
- Do not include CSS or JavaScript.
- If no changes are needed for the HTML, respond with "NO CHANGES NEEDED FOR HTML" in your response field.
- Otherwise, put the HTML code inside a ```html code block in your response field.
- Use the required JSON format with response, agents (empty), functions_list (empty), and next_step: 'await_operator'.
"""


def get_css_prompt():
    return """
### TASK: Provide ONLY the CSS for the program:
- Do not include HTML or JavaScript.
- If no changes are needed for the CSS, respond with "NO CHANGES NEEDED FOR CSS" in your response field.
- Otherwise, put the CSS code inside a ```css code block in your response field.
- Use the required JSON format with response, agents (empty), functions_list (empty), and next_step: 'await_operator'.
"""


def get_js_prompt():
    return """
### TASK: Provide ONLY the JavaScript for the program:
- Do not include HTML or CSS.
- If no changes are needed for the JavaScript, respond with "NO CHANGES NEEDED FOR JS" in your response field.
- Otherwise, put the JavaScript code inside a ```javascript code block in your response field.
- Use the required JSON format with response, agents (empty), functions_list (empty), and next_step: 'await_operator'.
"""

