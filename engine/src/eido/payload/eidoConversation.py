import os
from src.eido.utils.eido_config import fetch_local_mode, fetch_local_path

from src.disk.pythonDB.services.chats import crud as chat_crud

class eidoConversation():
    def __init__(self, email, conversation_id):
        self.email = email
        self.conversation_id = conversation_id

    ########################################################

    def filter_paths(self, dirs, files, excluded_items, excluded_starts_with, allowed_extensions):
        if excluded_starts_with is None:
            excluded_starts_with = []
        dirs[:] = [
            d for d in dirs
            if not any(d.startswith(prefix) for prefix in excluded_starts_with)
            and d not in excluded_items
        ]

        # Filter files based on criteria
        filtered_files = []
        for f in files:
            # Skip files that start with any prefix in excluded_starts_with or are in excluded items
            if any(f.startswith(prefix) for prefix in excluded_starts_with) or f in excluded_items:
                continue

            # If allowed_extensions is a function (for backward compatibility)
            if callable(allowed_extensions):
                if allowed_extensions(f):
                    filtered_files.append(f)
            # If allowed_extensions is a set of extensions
            elif allowed_extensions is None or os.path.splitext(f)[1].lower() in allowed_extensions:
                filtered_files.append(f)

        return filtered_files

    async def local_workspace(self):  
        local_mode = await fetch_local_mode(email=self.email)

        if local_mode == "false":
            local_prompt = "### You do not have access to the local environment at the moment."
            return local_prompt

        elif local_mode == "true":
            local_path = await fetch_local_path(email=self.email)

            if not local_path:
                error_msg = "ERROR: local_path is not configured or is empty."
                print(f"### Local: {error_msg}")
                return error_msg
            
            local_path = os.path.abspath(local_path)
            
            if not os.path.exists(local_path):
                error_msg = f"ERROR: local_path '{local_path}' does not exist."
                print(f"### Local: {error_msg}")
                return error_msg
            
            if not os.path.isdir(local_path):
                error_msg = f"ERROR: local_path '{local_path}' is not a directory."
                print(f"### Local: {error_msg}")
                return error_msg
            
            if not os.access(local_path, os.R_OK):
                error_msg = f"ERROR: No read permission for local_path '{local_path}'."
                print(f"### Local: {error_msg}")
                return error_msg
            
            excluded_items = {"target", "node_modules", "venv"}
            excluded_starts_with = {".", "#"}
            allowed_extensions = {
                # Basic text files
                '.txt', '.text', '.log',
                
                # Programming languages
                '.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.cpp', '.c', '.cc', '.cxx', '.h', '.hpp', '.hxx',
                '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.pl', '.r', '.m', '.mm', '.f', '.f90',
                '.pas', '.dpr', '.vb', '.vbs', '.asm', '.s', '.lua', '.dart', '.elm', '.ex', '.exs', '.clj', '.cljs',
                '.hs', '.ml', '.mli', '.fs', '.fsx', '.jl', '.nim', '.cr', '.zig', '.v', '.vv',
                
                # Web technologies
                '.html', '.htm', '.xhtml', '.css', '.scss', '.sass', '.less', '.svg', '.vue', '.svelte',
                
                # Configuration files
                '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf', '.config', '.properties', '.env',
                '.gitignore', '.gitattributes', '.editorconfig', '.dockerignore',
                
                # Shell scripts
                '.sh', '.bash', '.zsh', '.fish', '.bat', '.cmd', '.ps1', '.psm1',
                
                # Documentation
                '.md', '.markdown', '.mdown', '.mkd', '.rst', '.tex', '.latex', '.adoc', '.asciidoc', '.wiki',
                '.org', '.textile',
                
                # Data formats
                '.csv', '.tsv', '.xml', '.sql', '.graphql', '.gql',
                
                # Build and project files
                '.makefile', '.dockerfile', '.containerfile', '.gradle', '.sbt', '.pom', '.proj', '.csproj',
                '.vcxproj', '.xcodeproj', '.pbxproj',
                
                # Others
                '.patch', '.diff', '.LICENSE', '.CHANGELOG', '.CONTRIBUTING', '.README', '.TODO',
                '.gitmodules', '.htaccess', '.robots'
            }
            
            
            local_contents = []
            
            try:
                for root, dirs, files in os.walk(local_path):
                    files = self.filter_paths(dirs, files, excluded_items, excluded_starts_with, allowed_extensions)
                    for file in files:
                        file_path = os.path.join(root, file)
                        try:
                            # Try multiple encodings to handle different file types
                            encodings_to_try = ['utf-8', 'windows-1252', 'iso-8859-1', 'cp1252']
                            content = None
                            
                            for encoding in encodings_to_try:
                                try:
                                    with open(file_path, 'r', encoding=encoding) as infile:
                                        content = infile.read()
                                        break  # Successfully read with this encoding
                                except UnicodeDecodeError:
                                    continue  # Try next encoding
                            
                            if content is not None:
                                local_contents.append(f'\n//File path: {file_path}.' + "\n//File content:\n" + content + "\n//End of file content.\n---")
                            else:
                                print(f"### Local: Could not decode {file_path} with any supported encoding. File skipped.")
                                
                        except (FileNotFoundError, PermissionError) as e:
                            print(f"### Local: Error reading {file_path}: {e}. File skipped.")
            except (PermissionError, OSError) as e:
                error_msg = f"ERROR: Failed to walk local_path '{local_path}': {e}"
                print(f"### Local: {error_msg}")
                return error_msg

            
            local_path_prompt = f"### This is the directory path of YOUR local environment '{local_path}'; YOU MUST use this path for your local events and actions."
            excluded_items_prompt = "### Excluded items:\n'''\n" + str(excluded_items) + "\n'''."
            excluded_starts_with_prompt = "### Excluded items that starts with:\n'''\n" + str(excluded_starts_with) + "\n'''."
            allowed_extensions_prompt = "### Allowed extensions:\n'''\n" + "Only text based files"#str(allowed_extensions) + "\n'''."


            local_prompt = f"""
[**INTERNAL SYSTEM MESSAGE**] Automatic pulling of local context before replying:

{local_path_prompt}

{excluded_items_prompt}

{excluded_starts_with_prompt}

{allowed_extensions_prompt}

### This is the local of this session, it contains all the files in your local: 
//Beginning of local//        
'''
{local_contents} 
'''
//End of local//    
            """
            
            return local_prompt

        else:
            global_context_cong_missing = "ERROR: Context mode is not configured to True or False, please check your disk structure and try again."
            print(f"get_global_context: {global_context_cong_missing}")
            return global_context_cong_missing

    ########################################################

    async def chat_history(self):
        messages = await chat_crud.get_conversation_history(self.conversation_id, self.email)
        chat_history = []
        for m in messages:
            role = m.get("role")
            content = m.get("content")
            if content is None:
                continue
            chat_history.append({"role": role, "content": content})


        local_prompt = await self.local_workspace()
        
        # If local_prompt is not empty, insert it as second-to-last message
        if local_prompt != "":
            # Handle case where chat_history might be None or empty
            if chat_history is None:
                chat_history = []
            
            # Create local message object
            local_message = {
                "role": "assistant",
                "content": local_prompt
            }
            
            # If there are at least 2 messages, insert local_prompt as second-to-last
            if len(chat_history) >= 2:
                # Insert local_message before the last message
                chat_history.insert(-1, local_message)
            elif len(chat_history) == 1:
                # If only one message, insert local_message before it
                chat_history.insert(0, local_message)
            else:
                # If empty, just add the local_message
                chat_history.append(local_message)
        
        return chat_history
