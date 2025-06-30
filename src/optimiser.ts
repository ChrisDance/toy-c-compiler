// src/iterative-optimizer.ts
import {
  AssignmentStatement,
  BinaryExpression,
  BlockStatement,
  Expression,
  ExpressionStatement,
  FunctionCall,
  FunctionDeclaration,
  Identifier,
  IfStatement,
  NodeType,
  NumberLiteral,
  Program,
  ReturnStatement,
  Statement,
  VariableDeclaration,
  WhileStatement,
} from "./parser";

export interface OptimizationStats {
  passes: number;
  constantFolding: number;
  constantPropagation: number;
  deadCodeElimination: number;
  algebraicSimplification: number;
  totalOptimizations: number;
  functionsRemoved: number;
}

interface ConstantMap {
  [name: string]: number | undefined;
}

interface PassStats {
  constantFolding: number;
  constantPropagation: number;
  deadCodeElimination: number;
  algebraicSimplification: number;
}

enum OptimizationPhase {
  DeadCodeElimination = "Dead Code Elimination",
  ConstantPropagation = "Constant Propagation",
  ConstantFolding = "Constant Folding",
  AlgebraicSimplification = "Algebraic Simplification",
}

export class IterativeOptimizer {
  private stats!: OptimizationStats;
  private constantValues!: ConstantMap;
  private usedVariables!: Set<string>;
  private currentPassStats!: PassStats;
  private currentPhase!: OptimizationPhase;
  private phaseChanged: boolean = false;

  constructor() {
    this.resetStats();
  }

  private resetStats(): void {
    this.stats = {
      passes: 0,
      constantFolding: 0,
      constantPropagation: 0,
      deadCodeElimination: 0,
      algebraicSimplification: 0,
      totalOptimizations: 0,
      functionsRemoved: 0,
    };
    this.constantValues = {};
    this.usedVariables = new Set();
    this.resetPassStats();
  }

  private resetPassStats(): void {
    this.currentPassStats = {
      constantFolding: 0,
      constantPropagation: 0,
      deadCodeElimination: 0,
      algebraicSimplification: 0,
    };
  }

  functionQueue: FunctionDeclaration[] = [];
  _program!: Program;
  functionPass = false;
  optimize(
    program: Program,
    maxPasses: number = 10,
  ): { optimized: Program; stats: OptimizationStats } {
    this.resetStats();

    let currentProgram = this.deepClone(program);
    this._program = currentProgram;
    let passChanged = true;

    while (passChanged && this.stats.passes < maxPasses) {
      this.stats.passes++;
      this.resetPassStats();
      console.log(`\n=== Pass ${this.stats.passes} ===`);

      passChanged = false;

      // Phase 1: Dead Code Elimination
      this.currentPhase = OptimizationPhase.DeadCodeElimination;
      this.phaseChanged = false;
      console.log(`\nPass ${this.stats.passes}: ${this.currentPhase}`);

      this.constantValues = {};
      this.usedVariables = new Set();
      this.collectUsedVariables(currentProgram);
      currentProgram = this.runDeadCodeElimination(currentProgram);

      if (this.phaseChanged) {
        passChanged = true;
        console.log(
          `  DCE: ${this.currentPassStats.deadCodeElimination} eliminations`,
        );
      }

      // Phase 2: Constant Propagation
      this.currentPhase = OptimizationPhase.ConstantPropagation;
      this.phaseChanged = false;
      console.log(`\nPass ${this.stats.passes}: ${this.currentPhase}`);

      this.constantValues = {};
      currentProgram = this.runConstantPropagation(currentProgram);

      if (this.phaseChanged) {
        passChanged = true;
        console.log(
          `  CP: ${this.currentPassStats.constantPropagation} propagations`,
        );
      }

      // Phase 3: Constant Folding & Algebraic Simplification
      this.currentPhase = OptimizationPhase.ConstantFolding;
      this.phaseChanged = false;
      console.log(`\nPass ${this.stats.passes}: ${this.currentPhase}`);

      currentProgram = this.runConstantFolding(currentProgram);

      if (this.phaseChanged) {
        passChanged = true;
        console.log(`  CF: ${this.currentPassStats.constantFolding} foldings`);
        console.log(
          `  AS: ${this.currentPassStats.algebraicSimplification} simplifications`,
        );
      }

      // Update cumulative stats
      this.stats.constantFolding += this.currentPassStats.constantFolding;
      this.stats.constantPropagation +=
        this.currentPassStats.constantPropagation;
      this.stats.deadCodeElimination +=
        this.currentPassStats.deadCodeElimination;
      this.stats.algebraicSimplification +=
        this.currentPassStats.algebraicSimplification;
    }

    this.stats.totalOptimizations =
      this.stats.constantFolding +
      this.stats.constantPropagation +
      this.stats.deadCodeElimination +
      this.stats.algebraicSimplification;

    console.log(`\nOptimization completed after ${this.stats.passes} passes`);
    this.functionPass = true;
    if (currentProgram.functions.length === 0) {
      throw new Error("Program needs at least one function");
    }

    const b4NumFunctions = currentProgram.functions.length;
    let main = currentProgram.functions.find((f) => (f.name = "main"))!;
    if (!main) {
      throw new Error("Program needs a main function");
    }
    const f = currentProgram.functions.indexOf(main);
    main = currentProgram.functions.splice(f, 1)[0];
    console.log(main);

    const calledFunctions: Set<string> = new Set();
    this.functionQueue.push(main);
    do {
      const front = this.functionQueue.shift();
      calledFunctions.add(front?.name!);
      this.cpFunction(front!);
    } while (this.functionQueue.length);
    console.log("set", Array.from(calledFunctions));
    console.log("sdsada", currentProgram.functions);

    this.stats.functionsRemoved = b4NumFunctions - calledFunctions.size;

    currentProgram.functions = currentProgram.functions.filter((f) =>
      calledFunctions.has(f.name),
    );
    return { optimized: currentProgram, stats: { ...this.stats } };
  }

  // Dead Code Elimination Phase
  private runDeadCodeElimination(program: Program): Program {
    return {
      type: NodeType.Program,
      functions: program.functions.map((func) => this.dceFunction(func)),
    };
  }

  private dceFunction(func: FunctionDeclaration): FunctionDeclaration {
    return {
      ...func,
      body: this.dceBlock(func.body),
    };
  }

  private dceBlock(block: BlockStatement): BlockStatement {
    const statements: Statement[] = [];
    let foundReturn = false;

    for (const stmt of block.statements) {
      if (foundReturn) {
        this.currentPassStats.deadCodeElimination++;
        this.phaseChanged = true;
        console.log(`  DCE: Removed unreachable statement after return`);
        continue;
      }

      const processed = this.dceStatement(stmt);
      if (processed !== null) {
        statements.push(processed);
        if (processed.type === NodeType.ReturnStatement) {
          foundReturn = true;
        }
      }
    }

    return {
      type: NodeType.BlockStatement,
      statements,
    };
  }

  private dceStatement(stmt: Statement): Statement | null {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        if (
          !this.usedVariables.has(varDecl.name) &&
          !this.hasSideEffects(varDecl.init)
        ) {
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          console.log(`  DCE: Removed unused variable '${varDecl.name}'`);
          return null;
        }
        return stmt;

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        if (
          !this.usedVariables.has(assignment.target) &&
          !this.hasSideEffects(assignment.value)
        ) {
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          console.log(
            `  DCE: Removed assignment to unused variable '${assignment.target}'`,
          );
          return null;
        }
        return stmt;

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        const condition = ifStmt.condition;
        if (condition.type === NodeType.NumberLiteral) {
          const condValue = (condition as NumberLiteral).value;
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          if (condValue !== 0) {
            console.log(`  DCE: Removed else branch (condition always true)`);
            return this.cfStatement(ifStmt.thenBranch);
          } else {
            console.log(`  DCE: Removed then branch (condition always false)`);
            return ifStmt.elseBranch
              ? this.cfStatement(ifStmt.elseBranch)
              : { type: NodeType.BlockStatement, statements: [] };
          }
        }

        const thenBranch = this.dceStatement(ifStmt.thenBranch);
        const elseBranch = ifStmt.elseBranch
          ? this.dceStatement(ifStmt.elseBranch)
          : null;

        if (!thenBranch && !elseBranch) {
          return null;
        }

        return {
          ...ifStmt,
          thenBranch: thenBranch || {
            type: NodeType.BlockStatement,
            statements: [],
          },
          elseBranch,
        };

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        const body = this.dceStatement(whileStmt.body);
        if (!body) {
          return null;
        }
        return {
          ...whileStmt,
          body,
        };

      case NodeType.BlockStatement:
        return this.dceBlock(stmt as BlockStatement);

      case NodeType.ExpressionStatement:
        const exprStmt = stmt as ExpressionStatement;
        if (!this.hasSideEffects(exprStmt.expression)) {
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          console.log(`  DCE: Removed side-effect-free expression statement`);
          return null;
        }
        return stmt;

      default:
        return stmt;
    }
  }

  // Constant Propagation Phase
  private runConstantPropagation(program: Program): Program {
    return {
      type: NodeType.Program,
      functions: program.functions.map((func) => this.cpFunction(func)),
    };
  }

  private cpFunction(func: FunctionDeclaration): FunctionDeclaration {
    this.constantValues = {};
    return {
      ...func,
      body: this.cpBlock(func.body),
    };
  }

  private cpBlock(block: BlockStatement): BlockStatement {
    return {
      type: NodeType.BlockStatement,
      statements: block.statements.map((stmt) => this.cpStatement(stmt)),
    };
  }

  private cpStatement(stmt: Statement): Statement {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        const init = this.cpExpression(varDecl.init);

        // Track constant values
        if (init.type === NodeType.NumberLiteral) {
          this.constantValues[varDecl.name] = (init as NumberLiteral).value;
        }

        return {
          ...varDecl,
          init,
        };

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        const value = this.cpExpression(assignment.value);

        // Track constant values
        if (value.type === NodeType.NumberLiteral) {
          this.constantValues[assignment.target] = (
            value as NumberLiteral
          ).value;
        } else {
          delete this.constantValues[assignment.target];
        }

        return {
          ...assignment,
          value,
        };

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        return {
          ...ifStmt,
          condition: this.cpExpression(ifStmt.condition),
          thenBranch: this.cpStatement(ifStmt.thenBranch),
          elseBranch: ifStmt.elseBranch
            ? this.cpStatement(ifStmt.elseBranch)
            : null,
        };

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        return {
          ...whileStmt,
          condition: this.cpExpression(whileStmt.condition),
          body: this.cpStatement(whileStmt.body),
        };

      case NodeType.ReturnStatement:
        const returnStmt = stmt as ReturnStatement;
        return {
          ...returnStmt,
          argument: this.cpExpression(returnStmt.argument),
        };

      case NodeType.ExpressionStatement:
        const exprStmt = stmt as ExpressionStatement;
        return {
          ...exprStmt,
          expression: this.cpExpression(exprStmt.expression),
        };

      case NodeType.BlockStatement:
        return this.cpBlock(stmt as BlockStatement);

      default:
        return stmt;
    }
  }

  private cpExpression(expr: Expression): Expression {
    switch (expr.type) {
      case NodeType.Identifier:
        const id = expr as Identifier;
        if (
          this.constantValues.hasOwnProperty(id.name) &&
          this.constantValues[id.name] !== undefined
        ) {
          this.currentPassStats.constantPropagation++;
          this.phaseChanged = true;
          console.log(
            `  CP: Replaced '${id.name}' with ${this.constantValues[id.name]}`,
          );
          return {
            type: NodeType.NumberLiteral,
            value: this.constantValues[id.name]!,
          };
        }
        return expr;

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        return {
          ...binExpr,
          left: this.cpExpression(binExpr.left),
          right: this.cpExpression(binExpr.right),
        };

      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        if (this.functionPass) {
          this.functionQueue.push(
            this._program.functions.find((f) => f.name === funcCall.callee)!,
          );
        }

        return {
          ...funcCall,
          arguments: funcCall.arguments.map((arg) => this.cpExpression(arg)),
        };

      default:
        return expr;
    }
  }

  // Constant Folding & Algebraic Simplification Phase
  private runConstantFolding(program: Program): Program {
    return {
      type: NodeType.Program,
      functions: program.functions.map((func) => this.cfFunction(func)),
    };
  }

  private cfFunction(func: FunctionDeclaration): FunctionDeclaration {
    return {
      ...func,
      body: this.cfBlock(func.body),
    };
  }

  private cfBlock(block: BlockStatement): BlockStatement {
    return {
      type: NodeType.BlockStatement,
      statements: block.statements.map((stmt) => this.cfStatement(stmt)),
    };
  }

  private cfStatement(stmt: Statement): Statement {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        return {
          ...varDecl,
          init: this.cfExpression(varDecl.init),
        };

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        return {
          ...assignment,
          value: this.cfExpression(assignment.value),
        };

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        const condition = this.cfExpression(ifStmt.condition);

        return {
          ...ifStmt,
          condition,
          thenBranch: this.cfStatement(ifStmt.thenBranch),
          elseBranch: ifStmt.elseBranch
            ? this.cfStatement(ifStmt.elseBranch)
            : null,
        };

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        const whileCondition = this.cfExpression(whileStmt.condition);

        // Check for constant false condition
        if (whileCondition.type === NodeType.NumberLiteral) {
          const condValue = (whileCondition as NumberLiteral).value;
          if (condValue === 0) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;
            console.log(`  DCE: Removed while loop (condition always false)`);
            return { type: NodeType.BlockStatement, statements: [] };
          }
        }

        return {
          ...whileStmt,
          condition: whileCondition,
          body: this.cfStatement(whileStmt.body),
        };

      case NodeType.ReturnStatement:
        const returnStmt = stmt as ReturnStatement;
        return {
          ...returnStmt,
          argument: this.cfExpression(returnStmt.argument),
        };

      case NodeType.ExpressionStatement:
        const exprStmt = stmt as ExpressionStatement;
        return {
          ...exprStmt,
          expression: this.cfExpression(exprStmt.expression),
        };

      case NodeType.BlockStatement:
        return this.cfBlock(stmt as BlockStatement);

      default:
        return stmt;
    }
  }

  private cfExpression(expr: Expression): Expression {
    switch (expr.type) {
      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        const left = this.cfExpression(binExpr.left);
        const right = this.cfExpression(binExpr.right);

        // Algebraic Simplification first
        const simplified = this.algebraicSimplify(
          binExpr.operator,
          left,
          right,
        );
        if (simplified) {
          return simplified;
        }

        // Then constant folding
        if (
          left.type === NodeType.NumberLiteral &&
          right.type === NodeType.NumberLiteral
        ) {
          const leftVal = (left as NumberLiteral).value;
          const rightVal = (right as NumberLiteral).value;
          let result: number;

          switch (binExpr.operator) {
            case "+":
              result = leftVal + rightVal;
              break;
            case "-":
              result = leftVal - rightVal;
              break;
            case "*":
              result = leftVal * rightVal;
              break;
            case "/":
              if (rightVal === 0) {
                throw new Error("Division by zero");
              }
              result = Math.floor(leftVal / rightVal);
              break;
            case "<":
              result = leftVal < rightVal ? 1 : 0;
              break;
            case ">":
              result = leftVal > rightVal ? 1 : 0;
              break;
            case "==":
              result = leftVal === rightVal ? 1 : 0;
              break;
            default:
              return { ...binExpr, left, right };
          }

          this.currentPassStats.constantFolding++;
          this.phaseChanged = true;
          console.log(
            `  CF: Folded ${leftVal} ${binExpr.operator} ${rightVal} = ${result}`,
          );
          return { type: NodeType.NumberLiteral, value: result };
        }

        return { ...binExpr, left, right };

      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        return {
          ...funcCall,
          arguments: funcCall.arguments.map((arg) => this.cfExpression(arg)),
        };

      default:
        return expr;
    }
  }

  private algebraicSimplify(
    operator: string,
    left: Expression,
    right: Expression,
  ): Expression | null {
    // x + 0 = x, x - 0 = x
    if (
      (operator === "+" || operator === "-") &&
      right.type === NodeType.NumberLiteral &&
      (right as NumberLiteral).value === 0
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;
      console.log(`  AS: Simplified ${operator} 0`);
      return left;
    }

    // 0 + x = x
    if (
      operator === "+" &&
      left.type === NodeType.NumberLiteral &&
      (left as NumberLiteral).value === 0
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;
      console.log(`  AS: Simplified 0 +`);
      return right;
    }

    // x * 1 = x
    if (
      operator === "*" &&
      right.type === NodeType.NumberLiteral &&
      (right as NumberLiteral).value === 1
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;
      console.log(`  AS: Simplified * 1`);
      return left;
    }

    // 1 * x = x
    if (
      operator === "*" &&
      left.type === NodeType.NumberLiteral &&
      (left as NumberLiteral).value === 1
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;
      console.log(`  AS: Simplified 1 *`);
      return right;
    }

    // x * 0 = 0, 0 * x = 0
    if (
      operator === "*" &&
      ((left.type === NodeType.NumberLiteral &&
        (left as NumberLiteral).value === 0) ||
        (right.type === NodeType.NumberLiteral &&
          (right as NumberLiteral).value === 0))
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;
      console.log(`  AS: Simplified * 0`);
      return { type: NodeType.NumberLiteral, value: 0 };
    }

    // x / 1 = x
    if (
      operator === "/" &&
      right.type === NodeType.NumberLiteral &&
      (right as NumberLiteral).value === 1
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;
      console.log(`  AS: Simplified / 1`);
      return left;
    }

    return null;
  }

  private collectUsedVariables(program: Program): void {
    for (const func of program.functions) {
      this.collectUsedVariablesInFunction(func);
    }
  }

  private collectUsedVariablesInFunction(func: FunctionDeclaration): void {
    this.collectUsedVariablesInBlock(func.body);
  }

  private collectUsedVariablesInBlock(block: BlockStatement): void {
    for (const stmt of block.statements) {
      this.collectUsedVariablesInStatement(stmt);
    }
  }

  private collectUsedVariablesInStatement(stmt: Statement): void {
    switch (stmt.type) {
      case NodeType.ExpressionStatement:
        this.collectUsedVariablesInExpression(
          (stmt as ExpressionStatement).expression,
        );
        break;
      case NodeType.ReturnStatement:
        this.collectUsedVariablesInExpression(
          (stmt as ReturnStatement).argument,
        );
        break;
      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        this.collectUsedVariablesInExpression(ifStmt.condition);
        this.collectUsedVariablesInStatement(ifStmt.thenBranch);
        if (ifStmt.elseBranch) {
          this.collectUsedVariablesInStatement(ifStmt.elseBranch);
        }
        break;
      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        this.collectUsedVariablesInExpression(whileStmt.condition);
        this.collectUsedVariablesInStatement(whileStmt.body);
        break;
      case NodeType.BlockStatement:
        this.collectUsedVariablesInBlock(stmt as BlockStatement);
        break;
      case NodeType.AssignmentStatement:
        this.collectUsedVariablesInExpression(
          (stmt as AssignmentStatement).value,
        );
        break;
      case NodeType.VariableDeclaration:
        this.collectUsedVariablesInExpression(
          (stmt as VariableDeclaration).init,
        );
        break;
    }
  }

  private collectUsedVariablesInExpression(expr: Expression): void {
    switch (expr.type) {
      case NodeType.Identifier:
        this.usedVariables.add((expr as Identifier).name);
        break;
      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        this.collectUsedVariablesInExpression(binExpr.left);
        this.collectUsedVariablesInExpression(binExpr.right);
        break;
      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        for (const arg of funcCall.arguments) {
          this.collectUsedVariablesInExpression(arg);
        }
        break;
    }
  }

  private hasSideEffects(expr: Expression): boolean {
    switch (expr.type) {
      case NodeType.FunctionCall:
        return true; // Assume all function calls have side effects
      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        return (
          this.hasSideEffects(binExpr.left) ||
          this.hasSideEffects(binExpr.right)
        );
      default:
        return false;
    }
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
