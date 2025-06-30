import { Lexer } from "../src/Lexer";
import { NodeType, Parser, Program } from "../src/parser";

describe("Parser", () => {
  function parseCode(input: string): Program {
    const lexer = new Lexer(input);
    const tokens = lexer.scanTokens();
    const parser = new Parser(tokens);
    return parser.parse();
  }

  test("should parse a simple function", () => {
    const input = `
      int simple() {
        return 42;
      }
    `;

    const program = parseCode(input);

    expect(program.type).toBe(NodeType.Program);
    expect(program.functions.length).toBe(1);

    const func = program.functions[0];
    expect(func.type).toBe(NodeType.FunctionDeclaration);
    expect(func.name).toBe("simple");
    expect(func.params.length).toBe(0);
    expect(func.returnType).toBe("int");

    expect(func.body.type).toBe(NodeType.BlockStatement);
    expect(func.body.statements.length).toBe(1);

    const returnStmt = func.body.statements[0];
    expect(returnStmt.type).toBe(NodeType.ReturnStatement);
    expect((returnStmt as any).argument.type).toBe(NodeType.NumberLiteral);
    expect((returnStmt as any).argument.value).toBe(42);
  });

  test("should parse a function with parameters", () => {
    const input = `
      int add(int x) {
        return x;
      }
    `;

    const program = parseCode(input);
    const func = program.functions[0];

    expect(func.params.length).toBe(1);
    expect(func.params[0].type).toBe(NodeType.Parameter);
    expect(func.params[0].name).toBe("x");
    expect(func.params[0].paramType).toBe("int");
  });

  test("should parse variable declarations", () => {
    const input = `
      int main() {
        int x = 5;
        return x;
      }
    `;

    const program = parseCode(input);
    const func = program.functions[0];

    expect(func.body.statements.length).toBe(2);

    const varDecl = func.body.statements[0];
    expect(varDecl.type).toBe(NodeType.VariableDeclaration);
    expect((varDecl as any).name).toBe("x");
    expect((varDecl as any).varType).toBe("int");
    expect((varDecl as any).init.type).toBe(NodeType.NumberLiteral);
    expect((varDecl as any).init.value).toBe(5);
  });

  test("should parse if statements", () => {
    const input = `
      int max(int a) {
        if (a > 10) {
          return a;
        } else {
          return 10;
        }
      }
    `;

    const program = parseCode(input);
    const func = program.functions[0];

    expect(func.body.statements.length).toBe(1);

    const ifStmt = func.body.statements[0];
    expect(ifStmt.type).toBe(NodeType.IfStatement);

    // Check condition
    expect((ifStmt as any).condition.type).toBe(NodeType.BinaryExpression);
    expect((ifStmt as any).condition.operator).toBe(">");
    expect((ifStmt as any).condition.left.type).toBe(NodeType.Identifier);
    expect((ifStmt as any).condition.left.name).toBe("a");
    expect((ifStmt as any).condition.right.type).toBe(NodeType.NumberLiteral);
    expect((ifStmt as any).condition.right.value).toBe(10);

    // Check then branch
    expect((ifStmt as any).thenBranch.type).toBe(NodeType.BlockStatement);
    expect((ifStmt as any).thenBranch.statements.length).toBe(1);
    expect((ifStmt as any).thenBranch.statements[0].type).toBe(
      NodeType.ReturnStatement,
    );

    // Check else branch
    expect((ifStmt as any).elseBranch.type).toBe(NodeType.BlockStatement);
    expect((ifStmt as any).elseBranch.statements.length).toBe(1);
    expect((ifStmt as any).elseBranch.statements[0].type).toBe(
      NodeType.ReturnStatement,
    );
  });

  test("should parse function calls", () => {
    const input = `
      int main() {
        return Square(5);
      }
    `;

    const program = parseCode(input);
    const func = program.functions[0];

    const returnStmt = func.body.statements[0];
    expect(returnStmt.type).toBe(NodeType.ReturnStatement);

    const call = (returnStmt as any).argument;
    expect(call.type).toBe(NodeType.FunctionCall);
    expect(call.callee).toBe("Square");
    expect(call.arguments.length).toBe(1);
    expect(call.arguments[0].type).toBe(NodeType.NumberLiteral);
    expect(call.arguments[0].value).toBe(5);
  });

  test("should parse binary expressions", () => {
    const input = `
      int main() {
        return 5 * 10;
      }
    `;

    const program = parseCode(input);
    const func = program.functions[0];

    const returnStmt = func.body.statements[0];
    const expr = (returnStmt as any).argument;

    expect(expr.type).toBe(NodeType.BinaryExpression);
    expect(expr.operator).toBe("*");
    expect(expr.left.type).toBe(NodeType.NumberLiteral);
    expect(expr.left.value).toBe(5);
    expect(expr.right.type).toBe(NodeType.NumberLiteral);
    expect(expr.right.value).toBe(10);
  });

  test("should parse multiple functions", () => {
    const input = `
      int Square(int x) {
        return x * x;
      }

      int main() {
        return Square(5);
      }
    `;

    const program = parseCode(input);

    expect(program.functions.length).toBe(2);
    expect(program.functions[0].name).toBe("Square");
    expect(program.functions[1].name).toBe("main");
  });
});
