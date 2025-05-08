# C-like to ARM64 Assembly Compiler

A toy compiler that translates a simplified C-like language to ARM64 assembly code. This educational project demonstrates the core concepts of compiler design and implementation.

## Architecture Overview

This compiler follows the traditional three-phase compilation process:

1. **Lexical Analysis (Lexer)** - Transforms raw source code into a sequence of tokens
2. **Syntactic Analysis (Parser)** - Converts tokens into an Abstract Syntax Tree (AST)
3. **Code Generation** - Translates the AST into ARM64 assembly code

## Project Structure

```
├── src/
│   ├── Lexer.ts         # Tokenizes input source code
│   ├── parser.ts        # Builds AST representation
│   ├── codegen.ts       # Generates ARM64 assembly
│   └── index.ts         # Main entry point
├── test/
│   ├── lexer.test.ts    # Tests for the lexer
│   ├── parser.test.ts   # Tests for the parser
│   └── integration.test.ts # End-to-end tests
├── dist/                # Compiled JavaScript files
├── output.s             # Generated assembly output
├── package.json         # Project dependencies and scripts
└── tsconfig.json        # TypeScript configuration
```

## Detailed Compilation Flow

### 1. Lexical Analysis (Lexer.ts)
The lexer scans the input source code character by character and produces a stream of tokens:

- Recognizes language keywords (`int`, `return`, `if`, `else`)
- Identifies operators and punctuation (`+`, `-`, `*`, `/`, `=`, `==`, `<`, `>`, etc.)
- Extracts identifiers and numeric literals
- Tracks line numbers for error reporting
- Ignores whitespace and comments

### 2. Syntactic Analysis (parser.ts)
The parser implements a recursive descent algorithm to construct the AST:

- Builds a hierarchical tree structure representing the program
- Validates syntax according to grammar rules
- Creates node types for expressions, statements, and declarations
- Handles operator precedence and associativity
- Reports syntax errors with informative messages

### 3. Code Generation (codegen.ts)
The code generator traverses the AST and emits ARM64 assembly:

- Generates function prologues and epilogues
- Manages register allocation and stack frames
- Implements variable storage and retrieval
- Translates expressions and control flow structures
- Handles function calls with proper parameter passing
- Creates assembly code sections (text, data)

## Supported Language Features

The compiler supports a minimal but functional subset of C:

- Function declarations with parameters
- Integer variables and arithmetic
- Control flow with if/else statements
- Comparison operations
- Function calls (including external functions like `printf`)
- Return statements

## Example Code

```c
int Square(int arg)
{
    return arg * arg;
}

int main()
{
    int i = 5;
    int k = 4; 
    int j = k + i;
    if(i > j) 
    {
        printf(Square(Square(2)));
    } 
    else 
    {
        printf(5);
    }
    return 0;
}
```

The compiler converts this code into ARM64 assembly that:
1. Allocates stack space for variables
2. Implements function calls with proper register usage
3. Handles the if/else control flow with branching
4. Executes the correct path and prints the result (5)

## Generated Assembly

The generated ARM64 assembly (sample output):

```assembly
	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_Square					 ; -- Begin function Square
	.p2align	2
_Square:						 ; @Square
	sub	sp, sp, #32
	str	w0, [sp, #8]
	ldr	w0, [sp, #8]
	mov	w8, w0
	ldr	w0, [sp, #8]
	mov	w9, w0
	mul	w0, w8, w9
	add	sp, sp, #32
	ret
							 ; -- End function

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #48
	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill
	add	x29, sp, #32
	
	; ... rest of the assembly code ...
```

## Installation and Usage

### Prerequisites
- Node.js (v14 or later)
- npm or yarn

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/c-arm64-compiler.git
   cd c-arm64-compiler
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

### Running the Compiler
```bash
npm start
```
This will:
1. Compile the example program in `src/index.ts`
2. Generate ARM64 assembly in `output.s`

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:lexer
npm run test:parser
npm run test:codegen
npm run test:integration
```

## Motivation and Limitations

This was a purely education project done out of work hours, and therefore has limitations
which compel me to call it a toy-compiler. The motivation primarly came 
from wanting to build something which required me to work with assembly. 


## License

This project is licensed under the ISC License.
