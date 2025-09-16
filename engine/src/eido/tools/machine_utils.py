def install_py_library(library_name):
    """function to install a python library that is missing, use it when needed"""
    import subprocess
    import sys

    try:
        result = subprocess.check_output([sys.executable, '-m', 'pip', 'install', library_name],stderr=subprocess.STDOUT)
        return f'Successfully installed {library_name}', result.decode('utf-8')
    except subprocess.CalledProcessError as e:
        return f'Failed to install {library_name}. Error: {e.output.decode("utf-8")}'


def get_date_time():
    """Returns the current date and time as a string."""
    from datetime import datetime, UTC
    return datetime.now(UTC).strftime("%A - %H:%M:%S - %d-%m-%Y")




def run_shell_command(command):    
    """Executes a given command in the shell and returns the output."""
    import subprocess
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True)
    stdout, stderr = process.communicate()
    if process.returncode == 0:
        if stdout:
            return stdout.decode('utf-8')
        else:
            return "Shell command execution completed successfuly"
    else:
        return f'Error: {stderr.decode("utf-8")}'


def run_code(code_str):
    """This function runs the code in the code_str and returns the result, very useful in situations where you need to be fast, dont have the functions/tools/else implemented in you and you need it"""
    try:
        exec_globals = {}
        exec(code_str, exec_globals)
        if not exec_globals:
            return "Code execution completed successfuly"
        return exec_globals
    except Exception as e:
        return {'error': str(e)}