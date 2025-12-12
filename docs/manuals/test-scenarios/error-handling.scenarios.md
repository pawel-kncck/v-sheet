# Error Handling Test Scenarios

**Last Updated**: 2025-12-12

Test scenarios for formula errors and error handling in v-sheet.

---

## Division by Zero (#DIV/0!)

### ERR-DIV-001: Direct Division by Zero
**Given**: Cell A1 contains `=1/0`
**When**: Formula is evaluated
**Then**: Cell displays `#DIV/0!`
**And**: Cell has error styling

### ERR-DIV-002: Division by Empty Cell
**Given**: Cell B1 is empty
**And**: Cell A1 contains `=10/B1`
**When**: Formula is evaluated
**Then**: Cell displays `#DIV/0!`
**Note**: Empty cell coerces to 0

### ERR-DIV-003: Division by Zero in Function
**Given**: Cell A1 contains `=MOD(10, 0)`
**When**: Formula is evaluated
**Then**: Cell displays `#DIV/0!`

---

## Name Error (#NAME?)

### ERR-NAME-001: Unknown Function
**Given**: Cell A1 contains `=SUMM(1,2,3)` (typo)
**When**: Formula is evaluated
**Then**: Cell displays `#NAME?`

### ERR-NAME-002: Completely Unknown Function
**Given**: Cell A1 contains `=FOOBAR(A2)`
**When**: Formula is evaluated
**Then**: Cell displays `#NAME?`

### ERR-NAME-003: Case Sensitivity
**Given**: Cell A1 contains `=sum(1,2,3)` (lowercase)
**When**: Formula is evaluated
**Then**: Cell displays result (functions are case-insensitive)
**Note**: Should NOT show #NAME?

---

## Value Error (#VALUE!)

### ERR-VAL-001: Text in Arithmetic
**Given**: Cell A1 contains `hello`
**And**: Cell B1 contains `=A1 * 2`
**When**: Formula is evaluated
**Then**: Cell B1 displays `0` (text coerces to 0)
**Note**: v-sheet coerces rather than errors

### ERR-VAL-002: Invalid Function Argument Type
**Given**: Cell A1 contains `=LEFT(123, 2)`
**When**: Function expects string
**Then**: May display `#VALUE!` or coerce
**Note**: Behavior depends on function implementation

---

## Reference Error (#REF!)

### ERR-REF-001: VLOOKUP Column Out of Range
**Given**: Range A1:B5 has data
**And**: Cell C1 contains `=VLOOKUP("test", A1:B5, 5, FALSE)`
**When**: Formula is evaluated
**Then**: Cell displays `#REF!`
**Note**: Requested column 5, only 2 columns exist

### ERR-REF-002: Invalid Cell Reference (Future)
**Given**: Cell A1 contains `=#REF!`
**When**: Formula is parsed
**Then**: Cell displays `#REF!`
**Note**: Represents deleted cell reference

---

## Not Available Error (#N/A)

### ERR-NA-001: VLOOKUP Value Not Found
**Given**: Range A1:B5 contains data
**And**: Cell C1 contains `=VLOOKUP("xyz", A1:B5, 2, FALSE)`
**And**: "xyz" does not exist in column A
**When**: Formula is evaluated
**Then**: Cell displays `#N/A`

### ERR-NA-002: MATCH Value Not Found
**Given**: Range A1:A5 contains [1, 2, 3, 4, 5]
**And**: Cell B1 contains `=MATCH(100, A1:A5, 0)`
**When**: Formula is evaluated
**Then**: Cell displays `#N/A`

---

## Number Error (#NUM!)

### ERR-NUM-001: Square Root of Negative
**Given**: Cell A1 contains `=SQRT(-1)`
**When**: Formula is evaluated
**Then**: Cell displays `#NUM!`

### ERR-NUM-002: Invalid LOG Argument
**Given**: Cell A1 contains `=LOG(-10)`
**When**: Formula is evaluated
**Then**: Cell displays `#NUM!`

### ERR-NUM-003: Number Overflow (Future)
**Given**: Cell A1 contains `=POWER(10, 1000)`
**When**: Formula would overflow
**Then**: Cell displays `#NUM!` or `Infinity`

---

## Error Propagation

### ERR-PROP-001: Error in Reference
**Given**: Cell A1 contains `=1/0` (#DIV/0!)
**And**: Cell B1 contains `=A1 + 5`
**When**: B1 is evaluated
**Then**: Cell B1 displays `#DIV/0!`
**Note**: Error propagates through references

### ERR-PROP-002: Error in SUM Range
**Given**: Cell A1 contains `=1/0` (#DIV/0!)
**And**: Cell A2 contains `10`
**And**: Cell B1 contains `=SUM(A1:A2)`
**When**: B1 is evaluated
**Then**: Cell B1 displays `#DIV/0!`
**Note**: SUM propagates errors

### ERR-PROP-003: Multiple Errors - First Wins
**Given**: Cell A1 contains `=1/0` (#DIV/0!)
**And**: Cell A2 contains `=SUMM(1)` (#NAME?)
**And**: Cell B1 contains `=A1 + A2`
**When**: B1 is evaluated
**Then**: Cell B1 displays `#DIV/0!` (first error encountered)

---

## Circular Reference

### ERR-CIRC-001: Direct Self-Reference
**Given**: User enters `=A1` in cell A1
**When**: Formula is validated
**Then**: Formula is rejected
**And**: Error message indicates circular reference

### ERR-CIRC-002: Indirect Circular Reference
**Given**: Cell A1 contains `=B1`
**And**: Cell B1 contains `=C1`
**And**: User enters `=A1` in cell C1
**When**: Formula is validated
**Then**: Formula is rejected
**And**: Circular reference detected

### ERR-CIRC-003: Long Chain Circular Reference
**Given**: A1 → B1 → C1 → D1 → E1
**And**: User enters `=A1` in E1
**When**: Formula is validated
**Then**: Circular reference detected
**And**: Formula is rejected

---

## Parse Errors

### ERR-PARSE-001: Unclosed Parenthesis
**Given**: Cell A1 contains `=SUM(1,2`
**When**: Formula is parsed
**Then**: Parse error displayed

### ERR-PARSE-002: Invalid Operator Sequence
**Given**: Cell A1 contains `=1 + + 2`
**When**: Formula is parsed
**Then**: Parse error displayed

### ERR-PARSE-003: Missing Range End
**Given**: Cell A1 contains `=SUM(A1:)`
**When**: Formula is parsed
**Then**: Parse error displayed

---

## Error Display

### ERR-DISP-001: Error Styling
**Given**: Cell A1 has formula error
**When**: Cell is rendered
**Then**: Cell text is error code (e.g., `#DIV/0!`)
**And**: Cell has `error` CSS class
**And**: Text may be colored red

### ERR-DISP-002: Error Tooltip (Future)
**Given**: Cell A1 displays `#DIV/0!`
**When**: User hovers over cell
**Then**: Tooltip shows detailed error message
**Note**: Not yet implemented

### ERR-DISP-003: Error in Formula Bar
**Given**: Cell A1 displays `#DIV/0!`
**When**: User selects A1
**Then**: Formula bar shows original formula `=1/0`
**And**: Not the error code

---

## Error Functions (Future)

### ERR-FUNC-001: ISERROR Function
**Given**: Cell A1 contains `=1/0`
**And**: Cell B1 contains `=ISERROR(A1)`
**When**: B1 is evaluated
**Then**: Cell B1 displays `TRUE`
**Note**: Not yet implemented

### ERR-FUNC-002: IFERROR Function
**Given**: Cell A1 contains `=1/0`
**And**: Cell B1 contains `=IFERROR(A1, "Error!")`
**When**: B1 is evaluated
**Then**: Cell B1 displays `Error!`
**Note**: Not yet implemented

### ERR-FUNC-003: ISNA Function
**Given**: Cell A1 contains `=VLOOKUP("x", B1:C1, 2, FALSE)` (#N/A)
**And**: Cell D1 contains `=ISNA(A1)`
**When**: D1 is evaluated
**Then**: Cell D1 displays `TRUE`
**Note**: Not yet implemented
