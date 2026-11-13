package repositories

import (
	"errors"

	"github.com/go-sql-driver/mysql"
)

// ErrDuplicate is returned when an insert violates a unique constraint.
var ErrDuplicate = errors.New("duplicate record")

// ErrNotFound is returned when a write matches no row, including rows owned by someone else.
var ErrNotFound = errors.New("record not found")

const mysqlDuplicateEntryCode = 1062

// isDuplicateKeyError reports whether err is a MySQL/MariaDB duplicate-entry violation.
func isDuplicateKeyError(err error) bool {
	var mysqlErr *mysql.MySQLError
	return errors.As(err, &mysqlErr) && mysqlErr.Number == mysqlDuplicateEntryCode
}
