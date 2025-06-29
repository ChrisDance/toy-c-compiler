// src/optimizer.ts
import {
  Program,
  FunctionDeclaration,
  Statement,
  Expression,
  BinaryExpression,
  NumberLiteral,
  NodeType,
  BlockStatement,
  VariableDeclaration,
  ReturnStatement,
  IfStatement,
  Identifier,
  AssignmentStatement,
  WhileStatement,
  FunctionCall,
} from "./parser";

export interface OptimizationStats {
  constantFolding: number;
  deadCodeElimination: number;
  algebraicSimplification: number;
}

export class BasicOptimizer {
  private stats: OptimizationStats = {
    constantFolding: 0,
    deadCodeElimination: 0,
    algebraicSimplification: 0,
  };

  optimize(program: Program): { optimized: Program; stats: OptimizationStats } {
    this.stats = {
      constantFolding: 0,
      deadCodeElimination: 0,
      algebraicSimplification: 0,
    };

    const optimizedFunctions = program.functions.map((func) =>
      this.optimizeFunction(func),
    );

    return {
      optimized: {
        type: NodeType.Program,
        functions: optimizedFunctions,
      },
      stats: { ...this.stats },
    };
  }

  private optimizeFunction(func: FunctionDeclaration): FunctionDeclaration {
    return {
      ...func,
      body: this.optimizeBlock(func.body),
    };
  }

  private optimizeBlock(block: BlockStatement): BlockStatement {
    const optimizedStatements: Statement[] = [];
    let reachable = true;

    for (const stmt of block.statements) {
      if (!reachable) {
        // Dead code after return/unconditional jump
        this.stats.deadCodeElimination++;
        continue;
      }

      const optimized = this.optimizeStatement(stmt);
      if (optimized) {
        optimizedStatements.push(optimized);

        // Check if this statement makes subsequent code unreachable
        if (this.isTerminatingStatement(optimized)) {
          reachable = false;
        }
      }
    }

    return {
      type: NodeType.BlockStatement,
      statements: optimizedStatements,
    };
  }

  private optimizeStatement(stmt: Statement): Statement | null {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        return {
          ...varDecl,
          init: this.optimizeExpression(varDecl.init),
        };

      case NodeType.ReturnStatement:
        const returnStmt = stmt as ReturnStatement;
        return {
          ...returnStmt,
          argument: this.optimizeExpression(returnStmt.argument),
        };

      case NodeType.IfStatement:
        return this.optimizeIfStatement(stmt as IfStatement);

      case NodeType.AssignmentStatement:
        const assignStmt = stmt as AssignmentStatement;
        return {
          ...assignStmt,
          value: this.optimizeExpression(assignStmt.value),
        };

      case NodeType.BlockStatement:
        return this.optimizeBlock(stmt as BlockStatement);

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        return {
          ...whileStmt,
          condition: this.optimizeExpression(whileStmt.condition),
          body: this.optimizeStatement(whileStmt.body)!,
        };

      case "ExpressionStatement":
        // Only remove expression statements that are truly side-effect free
        const exprStmt = stmt as any; // ExpressionStatement type
        const optimizedExpr = this.optimizeExpression(exprStmt.expression);

        // For educational purposes, only remove very simple cases
        if (this.isTrivialExpression(optimizedExpr)) {
          this.stats.deadCodeElimination++;
          return null; // Remove this statement
        }

        return {
          ...exprStmt,
          expression: optimizedExpr,
        };

      default:
        return stmt;
    }
  }

  private optimizeIfStatement(stmt: IfStatement): Statement | null {
    const optimizedCondition = this.optimizeExpression(stmt.condition);

    // Constant folding for if conditions
    if (optimizedCondition.type === NodeType.NumberLiteral) {
      this.stats.constantFolding++;
      const value = (optimizedCondition as NumberLiteral).value;

      if (value !== 0) {
        // Condition is always true - this is dead code elimination
        // We're eliminating the conditional structure and any else branch
        this.stats.deadCodeElimination++;
        return this.optimizeStatement(stmt.thenBranch);
      } else {
        // Condition is always false - eliminate the then branch
        this.stats.deadCodeElimination++;
        return stmt.elseBranch ? this.optimizeStatement(stmt.elseBranch) : null;
      }
    }

    const optimizedThen = this.optimizeStatement(stmt.thenBranch);
    const optimizedElse = stmt.elseBranch
      ? this.optimizeStatement(stmt.elseBranch)
      : null;

    if (!optimizedThen) {
      return null;
    }

    return {
      ...stmt,
      condition: optimizedCondition,
      thenBranch: optimizedThen,
      elseBranch: optimizedElse,
    };
  }

  private optimizeExpression(expr: Expression): Expression {
    switch (expr.type) {
      case NodeType.BinaryExpression:
        return this.optimizeBinaryExpression(expr as BinaryExpression);

      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        return {
          ...funcCall,
          arguments: funcCall.arguments.map((arg) =>
            this.optimizeExpression(arg),
          ),
        };

      default:
        return expr;
    }
  }

  private optimizeBinaryExpression(expr: BinaryExpression): Expression {
    const left = this.optimizeExpression(expr.left);
    const right = this.optimizeExpression(expr.right);

    // Constant folding: if both operands are constants, compute the result
    if (
      left.type === NodeType.NumberLiteral &&
      right.type === NodeType.NumberLiteral
    ) {
      const leftVal = (left as NumberLiteral).value;
      const rightVal = (right as NumberLiteral).value;
      let result: number;

      switch (expr.operator) {
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
            throw new Error("Division by zero in constant folding");
          }
          result = Math.floor(leftVal / rightVal); // Integer division
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
          return { ...expr, left, right };
      }

      this.stats.constantFolding++;
      return {
        type: NodeType.NumberLiteral,
        value: result,
      };
    }

    // Algebraic simplifications
    if (left.type === NodeType.NumberLiteral) {
      const leftVal = (left as NumberLiteral).value;

      switch (expr.operator) {
        case "+":
          if (leftVal === 0) {
            this.stats.algebraicSimplification++;
            return right; // 0 + x = x
          }
          break;
        case "*":
          if (leftVal === 0) {
            this.stats.algebraicSimplification++;
            return { type: NodeType.NumberLiteral, value: 0 }; // 0 * x = 0
          }
          if (leftVal === 1) {
            this.stats.algebraicSimplification++;
            return right; // 1 * x = x
          }
          break;
      }
    }

    if (right.type === NodeType.NumberLiteral) {
      const rightVal = (right as NumberLiteral).value;

      switch (expr.operator) {
        case "+":
          if (rightVal === 0) {
            this.stats.algebraicSimplification++;
            return left; // x + 0 = x
          }
          break;
        case "-":
          if (rightVal === 0) {
            this.stats.algebraicSimplification++;
            return left; // x - 0 = x
          }
          break;
        case "*":
          if (rightVal === 0) {
            this.stats.algebraicSimplification++;
            return { type: NodeType.NumberLiteral, value: 0 }; // x * 0 = 0
          }
          if (rightVal === 1) {
            this.stats.algebraicSimplification++;
            return left; // x * 1 = x
          }
          break;
        case "/":
          if (rightVal === 1) {
            this.stats.algebraicSimplification++;
            return left; // x / 1 = x
          }
          break;
      }
    }

    // Check for x - x = 0, x / x = 1 (for identifiers)
    if (
      left.type === NodeType.Identifier &&
      right.type === NodeType.Identifier
    ) {
      const leftId = left as Identifier;
      const rightId = right as Identifier;

      if (leftId.name === rightId.name) {
        switch (expr.operator) {
          case "-":
            this.stats.algebraicSimplification++;
            return { type: NodeType.NumberLiteral, value: 0 }; // x - x = 0
          case "/":
            this.stats.algebraicSimplification++;
            return { type: NodeType.NumberLiteral, value: 1 }; // x / x = 1
        }
      }
    }

    return { ...expr, left, right };
  }

  private isTerminatingStatement(stmt: Statement): boolean {
    switch (stmt.type) {
      case NodeType.ReturnStatement:
        return true;

      case NodeType.IfStatement:
        // Only if both branches terminate (and there is an else branch)
        return (
          stmt.elseBranch !== null &&
          this.isTerminatingStatement(stmt.thenBranch) &&
          this.isTerminatingStatement(stmt.elseBranch)
        );

      case NodeType.BlockStatement:
        // Block terminates if any statement in it terminates
        return stmt.statements.some((s) => this.isTerminatingStatement(s));

      default:
        return false;
    }
  }

  private isTrivialExpression(expr: Expression): boolean {
    // Only consider very simple expressions as trivial
    // Real compilers would be much more conservative here
    switch (expr.type) {
      case NodeType.NumberLiteral:
        return true; // A bare number like "42;" can be removed

      case NodeType.Identifier:
        return true; // A bare variable reference like "x;" can be removed

      case NodeType.BinaryExpression:
        // Only if it's a simple arithmetic operation with no function calls
        return (
          this.isTrivialExpression(expr.left) &&
          this.isTrivialExpression(expr.right) &&
          ["+", "-", "*", "/", "<", ">", "=="].includes(expr.operator)
        );

      case NodeType.FunctionCall:
        return false; // Never remove function calls - they might have side effects

      default:
        return false;
    }
  }

  private hasNoSideEffects(expr: Expression): boolean {
    // This is much more conservative than isTrivialExpression
    // Real compilers need extensive analysis to determine side effects
    switch (expr.type) {
      case NodeType.NumberLiteral:
      case NodeType.Identifier:
        return true;

      case NodeType.BinaryExpression:
        return (
          this.hasNoSideEffects(expr.left) && this.hasNoSideEffects(expr.right)
        );

      case NodeType.FunctionCall:
        // In a real compiler, you'd need:
        // - Function purity analysis
        // - Escape analysis
        // - Inter-procedural analysis
        // For now, assume all function calls have side effects
        return false;

      default:
        return false;
    }
  }
}
