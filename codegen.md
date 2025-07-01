# ARM64 Assembly Knowledge Documentation for Toy C Compiler

## Overview

This document details the ARM64/AArch64 assembly instructions and concepts used in the toy C compiler's code generator. The compiler targets ARM64 architecture (64-bit ARM) and generates assembly code for macOS systems.

## Key Architecture Concepts

### 64-bit Register Set
The code generator exclusively uses ARM64's 64-bit general-purpose registers (x0-x30):

- **x0-x7**: Parameter passing and return values (ARM64 calling convention)
- **x8-x15**: Available for register allocation in expressions
- **x29**: Frame pointer (FP) - points to the current stack frame
- **x30**: Link register (LR) - stores return addresses
- **sp**: Stack pointer - points to the top of the stack

### Memory Model
- **64-bit addressing**: All pointers and addresses are 64-bit values
- **8-byte alignment**: Stack operations and variable storage use 8-byte alignment
- **Little-endian**: Data is stored in little-endian format

## Core Assembly Instructions Used

### Data Movement Instructions

#### MOV - Move Immediate/Register
```assembly
mov x0, #5              ; Load immediate value 5 into x0
mov x8, x0              ; Copy contents of x0 to x8
```
- Used for loading immediate values and copying between registers
- Essential for constant loading and temporary value management

#### LDR - Load Register
```assembly
ldr x0, [x29, #-8]      ; Load 64-bit value from [frame_pointer - 8]
ldr x0, [sp, #16]       ; Load 64-bit value from [stack_pointer + 16]
```
- Loads 64-bit values from memory into registers
- Supports various addressing modes with immediate offsets
- Used for variable access and parameter loading

#### STR - Store Register
```assembly
str x0, [x29, #-8]      ; Store x0 to [frame_pointer - 8]
str x0, [sp, #16]       ; Store x0 to [stack_pointer + 16]
```
- Stores 64-bit register values to memory
- Companion to LDR for variable storage and stack operations

### Arithmetic Instructions

#### ADD - Addition
```assembly
add x0, x8, x9          ; x0 = x8 + x9
add x29, sp, #32        ; x29 = sp + 32 (frame pointer setup)
```
- Performs 64-bit integer addition
- Used for arithmetic expressions and address calculations

#### SUB - Subtraction
```assembly
sub x0, x8, x9          ; x0 = x8 - x9
sub sp, sp, #48         ; Allocate 48 bytes on stack
```
- Performs 64-bit integer subtraction
- Critical for stack allocation and arithmetic operations

#### MUL - Multiplication
```assembly
mul x0, x8, x9          ; x0 = x8 * x9
```
- 64-bit integer multiplication
- Used for arithmetic expressions

#### SDIV - Signed Division
```assembly
sdiv x0, x8, x9         ; x0 = x8 / x9 (signed)
```
- Signed 64-bit integer division
- Handles division operations in expressions

### Comparison and Conditional Instructions

#### CMP - Compare
```assembly
cmp x8, x9              ; Compare x8 and x9, set flags
cmp x0, #0              ; Compare x0 with zero
```
- Performs comparison and sets condition flags
- Essential for conditional execution and branching

#### CSET - Conditional Set
```assembly
cset x0, lt             ; Set x0 to 1 if less than, 0 otherwise
cset x0, gt             ; Set x0 to 1 if greater than, 0 otherwise
cset x0, eq             ; Set x0 to 1 if equal, 0 otherwise
```
- Sets register based on condition flags from previous CMP
- Implements comparison operators (<, >, ==)

### Control Flow Instructions

#### B - Unconditional Branch
```assembly
b L1_loop_start         ; Jump to label
b function_end          ; Jump to function epilogue
```
- Unconditional jump to a label
- Used for loop control and function flow

#### BEQ - Branch if Equal
```assembly
beq L1_endif            ; Branch if zero flag set (equal)
```
- Conditional branch based on comparison results
- Used in if-statements and loop conditions

#### BL - Branch with Link
```assembly
bl _printf              ; Call function, save return address in x30
bl _Square              ; Call user-defined function
```
- Function call instruction
- Saves return address in link register (x30)
- Transfers control to target function

#### RET - Return
```assembly
ret                     ; Return to address in x30
```
- Return from function using link register
- Equivalent to indirect branch to x30

### Stack Management Instructions

#### STP - Store Pair
```assembly
stp x29, x30, [sp, #32] ; Store frame pointer and link register
```
- Stores two 64-bit registers to consecutive memory locations
- Used in function prologues for register preservation
- Implements the ARM64 calling convention requirement

#### LDP - Load Pair
```assembly
ldp x29, x30, [sp, #32] ; Restore frame pointer and link register
```
- Loads two 64-bit registers from consecutive memory locations
- Used in function epilogues for register restoration
- Companion to STP instruction

## Stack Frame Management

### Function Prologue Pattern
```assembly
sub sp, sp, #48         ; Allocate stack space
stp x29, x30, [sp, #32] ; Save frame pointer and link register
add x29, sp, #32        ; Set new frame pointer
```

### Function Epilogue Pattern
```assembly
ldp x29, x30, [sp, #32] ; Restore frame pointer and link register
add sp, sp, #48         ; Deallocate stack space
ret                     ; Return to caller
```

### Variable Storage Strategy
- **Main function**: Variables stored relative to frame pointer (x29) with negative offsets
- **Other functions**: Variables stored relative to stack pointer (sp) with positive offsets
- **8-byte alignment**: All variables allocated on 8-byte boundaries

## Register Allocation Strategy

### Simple Register Allocator
The compiler implements a basic register allocator using x8-x15:
- Allocates registers for complex expressions
- Falls back to stack-based evaluation when registers are exhausted
- Releases registers after use to maximize availability

### Expression Evaluation Patterns

#### Simple Binary Expression
```assembly
; Evaluate: a + b
ldr x0, [x29, #-8]      ; Load variable 'a'
mov x8, x0              ; Save in temporary register
ldr x0, [x29, #-16]     ; Load variable 'b'
add x0, x8, x0          ; Perform addition
```

#### Stack-based Fallback
```assembly
; When registers are exhausted
sub sp, sp, #16         ; Allocate temporary space
str x0, [sp]            ; Save left operand
; ... evaluate right operand ...
mov x9, x0              ; Save right operand
ldr x8, [sp]            ; Restore left operand
add sp, sp, #16         ; Deallocate temporary space
add x0, x8, x9          ; Perform operation
```

## Calling Convention Implementation

### Parameter Passing
- **x0-x7**: First 8 integer parameters
- **x0**: Return value register
- **Stack**: Additional parameters (not implemented in this toy compiler)

### Function Call Handling
```assembly
; Single argument function call
mov x0, #5              ; Load argument
bl _function            ; Call function

; Multiple argument handling (temporary stack storage)
str x0, [sp, #offset1]  ; Store first argument
str x1, [sp, #offset2]  ; Store second argument
ldr x0, [sp, #offset1]  ; Load into x0
ldr x1, [sp, #offset2]  ; Load into x1
bl _function            ; Make call
```

## Address Calculation and Pointer Operations

### Address-of Operator (&)
```assembly
add x0, x29, #-8        ; Calculate address of frame-relative variable
add x0, sp, #16         ; Calculate address of stack-relative variable
```

### Dereference Operator (*)
```assembly
; Load address first, then dereference
ldr x0, [x29, #-8]      ; Load pointer value
ldr x0, [x0]            ; Dereference pointer
```

### Pointer Assignment
```assembly
; *ptr = value
mov x8, x0              ; Save value
; ... calculate pointer address ...
str x8, [x0]            ; Store value at pointer location
```

## Assembly Directives and Sections

### Section Declarations
```assembly
.section __TEXT,__text,regular,pure_instructions
.build_version macos, 15, 0 sdk_version 15, 4
```
- Defines executable code section for macOS
- Specifies build and SDK versions for compatibility

### Function Symbols
```assembly
.globl _main            ; Export main function symbol
.p2align 2              ; Align function on 4-byte boundary
_main:                  ; Function label
```

### String Literals
```assembly
.section __TEXT,__cstring,cstring_literals
l_.str.0:
.asciz "%ld\n"         ; Null-terminated string
```

## Simplified Implementation Shortcuts

### 1. Limited Register Set
**Shortcut**: Uses only x8-x15 for register allocation
**Reason**: Simplifies register management and avoids complex spilling logic

### 2. Stack-based Fallback
**Shortcut**: Falls back to stack-based evaluation for complex expressions
**Reason**: Avoids implementing sophisticated register spilling algorithms

### 3. Hardcoded System Calls
**Shortcut**: Hardcodes `printf` and `exit` implementations
**Reason**: Avoids implementing a full linker or dynamic library loading

### 4. Fixed Stack Sizes
**Shortcut**: Uses calculated stack sizes rather than dynamic allocation
**Reason**: Simplifies stack management without variable-length arrays

### 5. No Optimization
**Shortcut**: Generates straightforward, unoptimized code
**Reason**: Educational focus on correctness over performance

### 6. Limited Pointer Support
**Shortcut**: Basic pointer operations without complex pointer arithmetic
**Reason**: Reduces complexity while demonstrating core concepts

## Memory Layout Assumptions

### Stack Growth
- Stack grows downward (decreasing addresses)
- Frame pointer points to saved registers area
- Local variables stored at negative offsets from frame pointer

### Alignment Requirements
- 8-byte alignment for all data
- 16-byte stack alignment at function calls (ARM64 ABI requirement)
- Word-aligned function entry points

## Error Handling Limitations

### Register Exhaustion
```assembly
; Fallback to stack when no registers available
sub sp, sp, #16
str x0, [sp]
; ... continue with stack-based operations
```

### Limited Parameter Count
- Maximum 8 parameters per function call
- Throws error for functions with more parameters
- Simplifies calling convention implementation

This documentation reflects the educational nature of the compiler, focusing on demonstrating core ARM64 assembly concepts while taking practical shortcuts to maintain simplicity and clarity.
