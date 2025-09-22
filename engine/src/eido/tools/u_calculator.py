def calculator_add(x, y):
    "Adds two numbers"
    return x + y

def calculator_subtract(x, y):
    "Subtracts two numbers"
    return x - y

def calculator_multiply(x, y):
    "Multiplies two numbers"
    return x * y

def calculator_divide(x, y):
    "Dives two numbers"
    if y == 0:
        return "Cannot divide by zero."
    return x / y

def calculator_modulus(x, y):
    "Returns the modulus of two numbers"
    return x % y

def calculator_exponent(x, y):
    "Returns the exponent of two numbers"
    return x ** y

def calculator_floor_division(x, y):
    "Returns the floor division of two numbers"
    return x // y