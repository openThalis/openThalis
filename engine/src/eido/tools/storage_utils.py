def list_files(directory_path):
    """List all files in a specified directory."""
    import os
    return [f for f in os.listdir(directory_path) if os.path.isfile(os.path.join(directory_path, f))]

def create_directory(directory_path):
    """Create a new directory at the specified path."""
    import os
    if not os.path.exists(directory_path):
        os.makedirs(directory_path)

def delete_directory(directory_path):
    """Delete a directory and all its contents at the specified path."""
    import shutil
    shutil.rmtree(directory_path)

def copy_file(source_path, destination_path):
    """Copy a file from the source path to the destination path."""
    from shutil import copyfile
    copyfile(source_path, destination_path)

def move_file(source_path, destination_path):
    """Move a file from the source path to the destination path."""
    from shutil import move
    move(source_path, destination_path)

def rename_file(old_path, new_path):
    """Rename a file from the old path to a new path."""
    import os
    os.rename(old_path, new_path)

def file_exists(file_path):
    """Check if a file exists at the specified path."""
    import os
    return os.path.isfile(file_path)

def directory_exists(directory_path):
    """Check if a directory exists at the given path."""
    import os
    return os.path.isdir(directory_path)


def create_file(file_path, content):
    """Create a file with the specified content."""
    with open(file_path, 'w') as file:
        file.write(content)
    return f"""Created a file with the specified content."""

def read_file(file_path):
    """Read the content of a file."""
    with open(file_path, 'r') as file:
        content = file.read()
    return f"""Content of file is {content}"""

def update_file(file_path, content):
    """Update the content of a file."""
    with open(file_path, 'w') as file:
        file.write(content)
    return f"""Updated the content of {file_path}."""

def delete_file(file_path):
    """Delete a specified file."""
    import os
    os.remove(file_path)
    return f"""Deleted a specified {file_path}"""


def search_file(directory_path, file_name):
    """Search for a file by name within a directory and its subfolders, including similar names and in subfolders as well."""
    import os
    found_files = []
    for root, dirs, files in os.walk(directory_path):
        for file in files:
            if file_name in file:
                found_files.append(os.path.join(root, file))
    if found_files:
        return found_files
    else:
        return f"No files found with the name '{file_name}' in the directory."


def search_directory(directory_path, directory_name):
    """Search for a directory by name within a directory and its subfolders, including similar names and in subfolders as well."""
    import os
    found_directories = []
    for root, dirs, files in os.walk(directory_path):
        for dir in dirs:
            if directory_name in dir:
                found_directories.append(os.path.join(root, dir))
    if found_directories:
        return found_directories
    else:
        return f"No directories found with the name {directory_name}."

def search_files_by_extension(directory_path, extension):
    """Search for files by extension within a directory and its subfolders."""
    import os
    found_files = []
    for root, dirs, files in os.walk(directory_path):
        for file in files:
            if file.endswith(extension):
                found_files.append(os.path.join(root, file))
    if found_files:
        return found_files
    else:
        return f"Couldn't find any files with the extension {extension}."

def search_for_files_containing_specific_text(directory_path, search_text):
    """Search for files containing specific text within a directory and its subfolders."""
    import os
    matching_files = []
    for root, dirs, files in os.walk(directory_path):
        for file in files:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r') as f:
                    if search_text in f.read():
                        matching_files.append(file_path)
            except UnicodeDecodeError:
                # Skip files that can't be read as text
                continue
    return matching_files if matching_files else f"No files found containing '{search_text}'."
    
