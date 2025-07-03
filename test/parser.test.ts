//@ts-nocheck
import { Lexer } from "../src/Lexer";
import {
  ExpressionStatement,
  FunctionCall,
  NodeType,
  Parser,
} from "../src/parser";

describe("Parser", () => {
  const parseCode = (code: string) => {
    const lexer = new Lexer().load(code);
    const tokens = lexer.run();

    const parser = new Parser().load(tokens);
    return parser.run();
  };

  const parseExpression = (code: string) => {
    const wrappedCode = `int main() { return ${code}; }`;
    const ast = parseCode(wrappedCode);
    return ast.functions[0].body.statements[0].argument;
  };

  // EXISTING TESTS (kept for compatibility)

  test("should parse empty program", () => {
    expect(() => parseCode("")).toThrow();
  });

  test("should parse simple function", () => {
    const code = `
      int main() {
        return 42;
      }
    `;

    const ast = parseCode(code);
    expect(ast.type).toBe(NodeType.Program);
    expect(ast.functions).toHaveLength(1);

    const mainFunc = ast.functions[0];
    expect(mainFunc.type).toBe(NodeType.FunctionDeclaration);
    expect(mainFunc.name).toBe("main");
    expect(mainFunc.returnType).toBe("int");
    expect(mainFunc.params).toHaveLength(0);
  });

  test("should parse function with parameters", () => {
    const code = `
      int add(int a, int b) {
        return a + b;
      }
    `;

    const ast = parseCode(code);
    const func = ast.functions[0];

    expect(func.params).toHaveLength(2);
    expect(func.params[0].name).toBe("a");
    expect(func.params[0].paramType).toBe("int");
    expect(func.params[1].name).toBe("b");
    expect(func.params[1].paramType).toBe("int");
  });

  test("should parse variable declaration", () => {
    const code = `
      int main() {
        int x = 5;
        return x;
      }
    `;

    const ast = parseCode(code);
    const statements = ast.functions[0].body.statements;

    expect(statements).toHaveLength(2);
    expect(statements[0].type).toBe(NodeType.VariableDeclaration);
    expect(statements[0].name).toBe("x");
    expect(statements[0].varType).toBe("int");
  });

  test("should parse if statement", () => {
    const code = `
      int main() {
        if (x > 5) {
          return 1;
        } else {
          return 0;
        }
      }
    `;

    const ast = parseCode(code);
    const ifStmt = ast.functions[0].body.statements[0];

    expect(ifStmt.type).toBe(NodeType.IfStatement);
    expect(ifStmt.condition.type).toBe(NodeType.BinaryExpression);
    expect(ifStmt.thenBranch.type).toBe(NodeType.BlockStatement);
    expect(ifStmt.elseBranch.type).toBe(NodeType.BlockStatement);
  });

  test("should parse binary expressions", () => {
    const expr = parseExpression("2 + 3 * 4");

    expect(expr.type).toBe(NodeType.BinaryExpression);
    expect(expr.operator).toBe("+");
    expect(expr.left.type).toBe(NodeType.NumberLiteral);
    expect(expr.left.value).toBe(2);

    expect(expr.right.type).toBe(NodeType.BinaryExpression);
    expect(expr.right.operator).toBe("*");
  });

  test("should parse function calls", () => {
    const expr = parseExpression("foo(1, 2)");

    expect(expr.type).toBe(NodeType.FunctionCall);
    expect(expr.callee).toBe("foo");
    expect(expr.arguments).toHaveLength(2);
  });

  test("should parse void function", () => {
    const code = `
      void test() {
        return;
      }
    `;

    const ast = parseCode(code);
    const func = ast.functions[0];

    expect(func.returnType).toBe("void");
    expect(func.body.statements[0].type).toBe(NodeType.ReturnStatement);
    expect(func.body.statements[0].argument.type).toBe(NodeType.VoidExpression);
  });

  // NEW POINTER-RELATED TESTS

  test("should parse pointer variable declaration", () => {
    const code = `
      int main() {
        int* ptr = &variable;
        return 0;
      }
    `;

    const ast = parseCode(code);
    const statements = ast.functions[0].body.statements;

    expect(statements).toHaveLength(2);

    const varDecl = statements[0];
    expect(varDecl.type).toBe(NodeType.VariableDeclaration);
    expect(varDecl.name).toBe("ptr");
    expect(varDecl.varType).toBe("int*");

    // Check the initializer is an address-of expression
    expect(varDecl.init.type).toBe(NodeType.UnaryExpression);
    expect(varDecl.init.operator).toBe("&");
    expect(varDecl.init.operand.type).toBe(NodeType.Identifier);
    expect(varDecl.init.operand.name).toBe("variable");
  });

  test("should parse pointer function parameter", () => {
    const code = `
      int func(int* ptr) {
        return *ptr;
      }
    `;

    const ast = parseCode(code);
    const func = ast.functions[0];

    expect(func.params).toHaveLength(1);
    expect(func.params[0].name).toBe("ptr");
    expect(func.params[0].paramType).toBe("int*");

    // Check the return statement dereferences the pointer
    const returnStmt = func.body.statements[0];
    expect(returnStmt.type).toBe(NodeType.ReturnStatement);
    expect(returnStmt.argument.type).toBe(NodeType.UnaryExpression);
    expect(returnStmt.argument.operator).toBe("*");
    expect(returnStmt.argument.operand.name).toBe("ptr");
  });

  test("should parse pointer function return type", () => {
    const code = `
      int* getPointer() {
        return ptr;
      }
    `;

    const ast = parseCode(code);
    const func = ast.functions[0];

    expect(func.returnType).toBe("int*");
    expect(func.name).toBe("getPointer");
  });

  test("should parse address-of expression", () => {
    const expr = parseExpression("&variable");

    expect(expr.type).toBe(NodeType.UnaryExpression);
    expect(expr.operator).toBe("&");
    expect(expr.operand.type).toBe(NodeType.Identifier);
    expect(expr.operand.name).toBe("variable");
  });

  test("should parse dereference expression", () => {
    const expr = parseExpression("*ptr");

    expect(expr.type).toBe(NodeType.UnaryExpression);
    expect(expr.operator).toBe("*");
    expect(expr.operand.type).toBe(NodeType.Identifier);
    expect(expr.operand.name).toBe("ptr");
  });

  test("should parse nested unary expressions", () => {
    const expr = parseExpression("*&variable");

    expect(expr.type).toBe(NodeType.UnaryExpression);
    expect(expr.operator).toBe("*");
    expect(expr.operand.type).toBe(NodeType.UnaryExpression);
    expect(expr.operand.operator).toBe("&");
    expect(expr.operand.operand.name).toBe("variable");
  });

  test("should parse pointer assignment to variable", () => {
    const code = `
      int main() {
        ptr = &variable;
        return 0;
      }
    `;

    const ast = parseCode(code);
    const statements = ast.functions[0].body.statements;

    const assignment = statements[0];
    expect(assignment.type).toBe(NodeType.AssignmentStatement);
    expect(assignment.target).toBe("ptr");
    expect(assignment.value.type).toBe(NodeType.UnaryExpression);
    expect(assignment.value.operator).toBe("&");
  });

  test("should parse assignment to dereferenced pointer", () => {
    const code = `
      int main() {
        *ptr = 42;
        return 0;
      }
    `;

    const ast = parseCode(code);
    const statements = ast.functions[0].body.statements;

    const assignment = statements[0];
    expect(assignment.type).toBe(NodeType.AssignmentStatement);
    expect(assignment.target.type).toBe(NodeType.UnaryExpression);
    expect(assignment.target.operator).toBe("*");
    expect(assignment.target.operand.name).toBe("ptr");
    expect(assignment.value.type).toBe(NodeType.NumberLiteral);
    expect(assignment.value.value).toBe(42);
  });

  test("should parse pointer arithmetic in expressions", () => {
    const expr = parseExpression("*ptr + 5");

    expect(expr.type).toBe(NodeType.BinaryExpression);
    expect(expr.operator).toBe("+");
    expect(expr.left.type).toBe(NodeType.UnaryExpression);
    expect(expr.left.operator).toBe("*");
    expect(expr.right.type).toBe(NodeType.NumberLiteral);
    expect(expr.right.value).toBe(5);
  });

  test("should parse complex pointer expressions", () => {
    const expr = parseExpression("&(*ptr + 3)");

    expect(expr.type).toBe(NodeType.UnaryExpression);
    expect(expr.operator).toBe("&");
    expect(expr.operand.type).toBe(NodeType.BinaryExpression);
    expect(expr.operand.operator).toBe("+");
    expect(expr.operand.left.type).toBe(NodeType.UnaryExpression);
    expect(expr.operand.left.operator).toBe("*");
  });

  test("should parse function with multiple pointer parameters", () => {
    const code = `
      int swap(int* a, int* b) {
        int temp = *a;
        *a = *b;
        *b = temp;
        return 0;
      }
    `;

    const ast = parseCode(code);
    const func = ast.functions[0];

    expect(func.params).toHaveLength(2);
    expect(func.params[0].paramType).toBe("int*");
    expect(func.params[1].paramType).toBe("int*");

    const statements = func.body.statements;
    expect(statements).toHaveLength(4); // temp declaration, two assignments, return

    // Check the variable declaration with dereference
    const tempDecl = statements[0];
    expect(tempDecl.type).toBe(NodeType.VariableDeclaration);
    expect(tempDecl.init.type).toBe(NodeType.UnaryExpression);
    expect(tempDecl.init.operator).toBe("*");

    // Check assignments to dereferenced pointers
    const assign1 = statements[1];
    expect(assign1.type).toBe(NodeType.AssignmentStatement);
    expect(assign1.target.type).toBe(NodeType.UnaryExpression);
    expect(assign1.target.operator).toBe("*");
  });

  test("should parse pointer comparison expressions", () => {
    const code = `
      int main() {
        if (ptr1 == ptr2) {
          return 1;
        }
        return 0;
      }
    `;

    const ast = parseCode(code);
    const ifStmt = ast.functions[0].body.statements[0];

    expect(ifStmt.type).toBe(NodeType.IfStatement);
    expect(ifStmt.condition.type).toBe(NodeType.BinaryExpression);
    expect(ifStmt.condition.operator).toBe("==");
    expect(ifStmt.condition.left.name).toBe("ptr1");
    expect(ifStmt.condition.right.name).toBe("ptr2");
  });

  test("should parse function call with pointer arguments", () => {
    const code = `
      int main() {
        func(&variable, ptr);
        return 0;
      }
    `;

    const ast = parseCode(code);
    const exprStmt = ast.functions[0].body.statements[0];

    expect(exprStmt.type).toBe(NodeType.ExpressionStatement);

    const funcCall = exprStmt.expression;
    expect(funcCall.type).toBe(NodeType.FunctionCall);
    expect(funcCall.callee).toBe("func");
    expect(funcCall.arguments).toHaveLength(2);

    // First argument is address-of
    expect(funcCall.arguments[0].type).toBe(NodeType.UnaryExpression);
    expect(funcCall.arguments[0].operator).toBe("&");

    // Second argument is identifier
    expect(funcCall.arguments[1].type).toBe(NodeType.Identifier);
    expect(funcCall.arguments[1].name).toBe("ptr");
  });

  test("should parse multiple levels of pointer dereferencing", () => {
    const expr = parseExpression("**ptr");

    expect(expr.type).toBe(NodeType.UnaryExpression);
    expect(expr.operator).toBe("*");
    expect(expr.operand.type).toBe(NodeType.UnaryExpression);
    expect(expr.operand.operator).toBe("*");
    expect(expr.operand.operand.name).toBe("ptr");
  });

  test("should handle operator precedence correctly with pointers", () => {
    const expr = parseExpression("*ptr + 2 * 3");

    expect(expr.type).toBe(NodeType.BinaryExpression);
    expect(expr.operator).toBe("+");

    // Left side should be *ptr
    expect(expr.left.type).toBe(NodeType.UnaryExpression);
    expect(expr.left.operator).toBe("*");

    // Right side should be 2 * 3
    expect(expr.right.type).toBe(NodeType.BinaryExpression);
    expect(expr.right.operator).toBe("*");
  });

  test("should parse parenthesized pointer expressions", () => {
    const expr = parseExpression("*(ptr + 1)");

    expect(expr.type).toBe(NodeType.UnaryExpression);
    expect(expr.operator).toBe("*");
    expect(expr.operand.type).toBe(NodeType.BinaryExpression);
    expect(expr.operand.operator).toBe("+");
    expect(expr.operand.left.name).toBe("ptr");
    expect(expr.operand.right.value).toBe(1);
  });

  test("should parse while loop with pointer condition", () => {
    const code = `
      int main() {
        while (*ptr > 0) {
          *ptr = *ptr - 1;
        }
        return 0;
      }
    `;

    const ast = parseCode(code);
    const whileStmt = ast.functions[0].body.statements[0];

    expect(whileStmt.type).toBe(NodeType.WhileStatement);
    expect(whileStmt.condition.type).toBe(NodeType.BinaryExpression);
    expect(whileStmt.condition.left.type).toBe(NodeType.UnaryExpression);
    expect(whileStmt.condition.left.operator).toBe("*");

    // Check the body contains pointer assignment
    expect(whileStmt.body.type).toBe(NodeType.BlockStatement);
    const assignment = whileStmt.body.statements[0];
    expect(assignment.type).toBe(NodeType.AssignmentStatement);
    expect(assignment.target.type).toBe(NodeType.UnaryExpression);
    expect(assignment.target.operator).toBe("*");
  });

  test("should parse mixed pointer and regular variable declarations", () => {
    const code = `
      int main() {
        int x = 5;
        int* ptr = &x;
        int y = *ptr;
        return y;
      }
    `;

    const ast = parseCode(code);
    const statements = ast.functions[0].body.statements;

    expect(statements).toHaveLength(4); // 3 declarations + return

    // Regular int declaration
    expect(statements[0].varType).toBe("int");
    expect(statements[0].name).toBe("x");

    // Pointer declaration
    expect(statements[1].varType).toBe("int*");
    expect(statements[1].name).toBe("ptr");
    expect(statements[1].init.type).toBe(NodeType.UnaryExpression);
    expect(statements[1].init.operator).toBe("&");

    // Declaration with dereferenced value
    expect(statements[2].varType).toBe("int");
    expect(statements[2].name).toBe("y");
    expect(statements[2].init.type).toBe(NodeType.UnaryExpression);
    expect(statements[2].init.operator).toBe("*");
  });

  test("should parse complex pointer function", () => {
    const code = `
      int* findMax(int* arr, int* size) {
        int* max = arr;
        int* current = arr;
        while (current < arr + *size) {
          if (*current > *max) {
            max = current;
          }
          current = current + 1;
        }
        return max;
      }
    `;

    const ast = parseCode(code);
    const func = ast.functions[0];

    // Check function signature
    expect(func.name).toBe("findMax");
    expect(func.returnType).toBe("int*");
    expect(func.params).toHaveLength(2);
    expect(func.params[0].paramType).toBe("int*");
    expect(func.params[1].paramType).toBe("int*");

    const statements = func.body.statements;
    expect(statements.length).toBeGreaterThan(3);

    // Check pointer variable declarations
    const maxDecl = statements[0];
    expect(maxDecl.type).toBe(NodeType.VariableDeclaration);
    expect(maxDecl.varType).toBe("int*");

    const currentDecl = statements[1];
    expect(currentDecl.type).toBe(NodeType.VariableDeclaration);
    expect(currentDecl.varType).toBe("int*");

    // Check while loop
    const whileStmt = statements[2];
    expect(whileStmt.type).toBe(NodeType.WhileStatement);
  });

  test("should handle error for invalid pointer syntax", () => {
    const invalidCodes = [
      "int main() { int** x; }", // Double pointer not supported
      "int main() { &; }", // Address-of nothing
      "int main() { *; }", // Dereference nothing
    ];

    invalidCodes.forEach((code) => {
      expect(() => parseCode(code)).toThrow();
    });
  });

  test("should parse pointer in if condition", () => {
    const code = `
      int main() {
        if (ptr && *ptr != 0) {
          return *ptr;
        }
        return 0;
      }
    `;

    // Note: This test assumes the lexer supports && operator
    // If not supported, modify to use simpler condition
    const simpleCode = `
      int main() {
        if (*ptr > 0) {
          return *ptr;
        }
        return 0;
      }
    `;

    const ast = parseCode(simpleCode);
    const ifStmt = ast.functions[0].body.statements[0];

    expect(ifStmt.type).toBe(NodeType.IfStatement);
    expect(ifStmt.condition.left.type).toBe(NodeType.UnaryExpression);
    expect(ifStmt.condition.left.operator).toBe("*");

    // Check return statement in then branch
    const thenReturn = ifStmt.thenBranch.statements[0];
    expect(thenReturn.type).toBe(NodeType.ReturnStatement);
    expect(thenReturn.argument.type).toBe(NodeType.UnaryExpression);
    expect(thenReturn.argument.operator).toBe("*");
  });

  test("should parse pointer assignment chains", () => {
    const code = `
      int main() {
        ptr1 = ptr2;
        *ptr1 = *ptr2;
        return 0;
      }
    `;

    const ast = parseCode(code);
    const statements = ast.functions[0].body.statements;

    // Regular pointer assignment
    const assign1 = statements[0];
    expect(assign1.type).toBe(NodeType.AssignmentStatement);
    expect(assign1.target).toBe("ptr1");
    expect(assign1.value.name).toBe("ptr2");

    // Dereferenced pointer assignment
    const assign2 = statements[1];
    expect(assign2.type).toBe(NodeType.AssignmentStatement);
    expect(assign2.target.type).toBe(NodeType.UnaryExpression);
    expect(assign2.target.operator).toBe("*");
    expect(assign2.value.type).toBe(NodeType.UnaryExpression);
    expect(assign2.value.operator).toBe("*");
  });

  test("should preserve operator precedence with mixed operations", () => {
    const expr = parseExpression("&variable + *ptr * 2");

    expect(expr.type).toBe(NodeType.BinaryExpression);
    expect(expr.operator).toBe("+");

    // Left side: &variable
    expect(expr.left.type).toBe(NodeType.UnaryExpression);
    expect(expr.left.operator).toBe("&");

    // Right side: *ptr * 2
    expect(expr.right.type).toBe(NodeType.BinaryExpression);
    expect(expr.right.operator).toBe("*");
    expect(expr.right.left.type).toBe(NodeType.UnaryExpression);
    expect(expr.right.left.operator).toBe("*");
  });

  test("should parse function returning pointer with complex expression", () => {
    const code = `
      int* getValue() {
        return &(arr[index]);
      }
    `;

    // Simplified version without array indexing (since arrays aren't supported)
    const simpleCode = `
      int* getValue() {
        return &variable;
      }
    `;

    const ast = parseCode(simpleCode);
    const func = ast.functions[0];

    expect(func.returnType).toBe("int*");

    const returnStmt = func.body.statements[0];
    expect(returnStmt.type).toBe(NodeType.ReturnStatement);
    expect(returnStmt.argument.type).toBe(NodeType.UnaryExpression);
    expect(returnStmt.argument.operator).toBe("&");
  });

  test("should handle backtracking in assignment parsing", () => {
    const code = `
      int main() {
        func(*ptr);
        return 0;
      }
    `;

    const ast = parseCode(code);
    const statements = ast.functions[0].body.statements;

    const exprStmt = statements[0];
    expect(exprStmt.type).toBe(NodeType.ExpressionStatement);

    const funcCall = (exprStmt as ExpressionStatement)
      .expression as FunctionCall;
    expect(funcCall.type).toBe(NodeType.FunctionCall);
    expect(funcCall.callee).toBe("func");
    expect(funcCall.arguments[0].type).toBe(NodeType.UnaryExpression);
    expect(funcCall.arguments[0].operator).toBe("*");
  });
});
