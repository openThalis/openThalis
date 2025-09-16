class DomainError(Exception):
    """Base class for domain-level errors that map to HTTP responses."""


class NotFoundError(DomainError):
    pass


class NotDirectoryError(DomainError):
    pass


class PermissionDeniedError(DomainError):
    pass


class AlreadyExistsError(DomainError):
    pass


class InvalidInputError(DomainError):
    pass


class ConflictError(DomainError):
    pass


class RangeNotSatisfiableError(DomainError):
    pass


