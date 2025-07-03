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
  UnaryExpression,
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
  pointersDetected: number;
}
export interface OptimisationResult {
  asm: Program;
  stats: OptimizationStats;
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

export class Optimizer {
  private stats!: OptimizationStats;
  private constantValues!: ConstantMap;
  private usedVariables!: Set<string>;
  private currentPassStats!: PassStats;
  private currentPhase!: OptimizationPhase;
  private phaseChanged: boolean = false;

  private hasPointers: boolean = false;
  private pointerVariables!: Set<string>; /*variables declared as pointer types*/
  private pointerReferencedVariables!: Set<string>; /*variables with address taken (&var)*/
  private program!: Program;

  load(program: Program): Optimizer {
    this.resetStats();
    this.program = this.deepClone(program);
    return this;
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
      pointersDetected: 0,
    };
    this.constantValues = {};
    this.usedVariables = new Set();
    this.pointerVariables = new Set();
    this.pointerReferencedVariables = new Set();
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

  /* multi-pass optimization with fixed-point iteration (runs until a pass didn't yield a change)*/
  run(maxPasses: number = 10): OptimisationResult {
    this.resetStats();

    /*
    phase 0: detect pointer disables optimization for aliased memory, as
    optimising pointers involves a lot more involved analysis.
    */

    this.detectPointers(this.program);

    if (this.hasPointers) {
      this.stats.pointersDetected =
        this.pointerVariables.size + this.pointerReferencedVariables.size;
    }

    let passChanged = true;

    while (passChanged && this.stats.passes < maxPasses) {
      this.stats.passes++;
      this.resetPassStats();

      passChanged = false;

      /* phase ordering crucial: dce->cp->cf*/

      /*phase 1: dead code elimination to remove unused variables and unreachable code
      int main()
      {
        int x = 3;
        int y = x + 7;
        int z = 2 * y; this is dead, because z isn't used until it's reassigned
        if(x < y) {
          z = x / 2 + y / 3;
        } else {
          z = x * y + y;
        }
      }
      */
      this.currentPhase = OptimizationPhase.DeadCodeElimination;
      this.phaseChanged = false;

      this.constantValues = {};
      this.usedVariables = new Set();
      this.collectUsedVariables(this.program);
      this.program = this.runDeadCodeElimination(this.program);

      if (this.phaseChanged) {
        passChanged = true;
      }

      /* phase 2: constant propagation to replace variable uses with their constant values
      int main()
      {
        int x = 3; x is constant, so replace it with 3 throughtout
        int y = x + 7;
        if(x < y) {
          z = x / 2 + y / 3;
        } else {
          z = x * y + y;
        }
      }

      */
      this.currentPhase = OptimizationPhase.ConstantPropagation;
      this.phaseChanged = false;

      this.constantValues = {};
      this.program = this.runConstantPropagation(this.program);

      if (this.phaseChanged) {
        passChanged = true;
      }

      /*  phase 3: constant folding & algebraic simplification to evaluate constant expressions,
          which might produce dead code for the next iteration to remove.

          int main()
          {
            int x = 3;  now x is dead code, and will be removed next iteration.
            int y = 10; 3 + 7 replaced with 10.
            if(3 < y) {
              z = 3 / 2 + y / 3;
            } else {
              z = 3 * y + y;
            }
          }

      */
      this.currentPhase = OptimizationPhase.ConstantFolding;
      this.phaseChanged = false;

      this.program = this.runConstantFolding(this.program);

      if (this.phaseChanged) {
        passChanged = true;
      }

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

    /* phase 4: dead function elimination by tracing the call graph from main,
    we want to do this after the other optimisations because calls made in if statements might be removed */

    if (this.program.functions.length === 0) {
      throw new Error("Program needs at least one function");
    }

    const mainFunction = this.program.functions.find((f) => f.name === "main");
    if (!mainFunction) {
      throw new Error("Program needs a main function");
    }

    /* bfs traversal of call graph */
    const calledFunctions = new Set<string>();
    const functionQueue: FunctionDeclaration[] = [mainFunction];

    while (functionQueue.length > 0) {
      const currentFunction = functionQueue.shift()!;

      if (calledFunctions.has(currentFunction.name)) {
        continue;
      }

      calledFunctions.add(currentFunction.name);

      this.findFunctionCalls(currentFunction).forEach((funcName) => {
        const calledFunc = this.program.functions.find(
          (f) => f.name === funcName,
        );
        if (calledFunc && !calledFunctions.has(funcName)) {
          functionQueue.push(calledFunc);
        }
      });
    }

    const originalFunctionCount = this.program.functions.length;
    const removedFunctions = this.program.functions
      .filter((f) => !calledFunctions.has(f.name))
      .map((f) => f.name);

    this.program.functions = this.program.functions.filter((f) =>
      calledFunctions.has(f.name),
    );

    this.stats.functionsRemoved = originalFunctionCount - calledFunctions.size;

    return { asm: this.program, stats: { ...this.stats } };
  }

  private detectPointers(program: Program): void {
    this.hasPointers = false;
    this.pointerVariables.clear();
    this.pointerReferencedVariables.clear();

    for (const func of program.functions) {
      this.detectPointersInFunction(func);
    }
  }

  private detectPointersInFunction(func: FunctionDeclaration): void {
    if (func.returnType.includes("*")) {
      this.hasPointers = true;
    }

    for (const param of func.params) {
      if (param.paramType.includes("*")) {
        this.hasPointers = true;
        this.pointerVariables.add(param.name);
      }
    }

    this.detectPointersInStatement(func.body);
  }

  private detectPointersInStatement(stmt: Statement): void {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        if (varDecl.varType.includes("*")) {
          this.hasPointers = true;
          this.pointerVariables.add(varDecl.name);
        }
        this.detectPointersInExpression(varDecl.init);
        break;

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        if (typeof assignment.target !== "string") {
          /* dereferenced pointer assignment (*ptr = value) - indicates pointer usage */
          this.hasPointers = true;
        }
        this.detectPointersInExpression(assignment.value);
        break;

      case NodeType.ExpressionStatement:
        this.detectPointersInExpression(
          (stmt as ExpressionStatement).expression,
        );
        break;

      case NodeType.ReturnStatement:
        this.detectPointersInExpression((stmt as ReturnStatement).argument);
        break;

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        this.detectPointersInExpression(ifStmt.condition);
        this.detectPointersInStatement(ifStmt.thenBranch);
        if (ifStmt.elseBranch) {
          this.detectPointersInStatement(ifStmt.elseBranch);
        }
        break;

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        this.detectPointersInExpression(whileStmt.condition);
        this.detectPointersInStatement(whileStmt.body);
        break;

      case NodeType.BlockStatement:
        const block = stmt as BlockStatement;
        for (const s of block.statements) {
          this.detectPointersInStatement(s);
        }
        break;
    }
  }

  private detectPointersInExpression(expr: Expression): void {
    switch (expr.type) {
      case NodeType.UnaryExpression:
        const unaryExpr = expr as UnaryExpression;
        this.hasPointers = true;

        if (unaryExpr.operator === "&") {
          /* address-of operation (&var) - marks variable as having escaped address */
          if (unaryExpr.operand.type === NodeType.Identifier) {
            const varName = (unaryExpr.operand as Identifier).name;
            this.pointerReferencedVariables.add(varName);
          }
        } else if (unaryExpr.operator === "*") {
          /* dereference operation (*ptr) - indicates pointer usage */
        }

        this.detectPointersInExpression(unaryExpr.operand);
        break;

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        this.detectPointersInExpression(binExpr.left);
        this.detectPointersInExpression(binExpr.right);
        break;

      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        for (const arg of funcCall.arguments) {
          this.detectPointersInExpression(arg);
        }
        break;

      /* identifier and NumberLiteral are safe by themselves */
      default:
        break;
    }
  }

  private canOptimizeVariable(varName: string): boolean {
    if (!this.hasPointers) return true;

    const isPointer = this.pointerVariables.has(varName);
    const hasAddressTaken = this.pointerReferencedVariables.has(varName);

    if (isPointer || hasAddressTaken) {
      return false;
    }

    return true;
  }

  private containsPointerOperations(expr: Expression): boolean {
    switch (expr.type) {
      case NodeType.UnaryExpression:
        const unaryExpr = expr as UnaryExpression;
        return unaryExpr.operator === "&" || unaryExpr.operator === "*";

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        return (
          this.containsPointerOperations(binExpr.left) ||
          this.containsPointerOperations(binExpr.right)
        );

      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        return funcCall.arguments.some((arg) =>
          this.containsPointerOperations(arg),
        );

      case NodeType.Identifier:
        const id = expr as Identifier;
        return this.pointerVariables.has(id.name);

      default:
        return false;
    }
  }

  private statementInvolvesPointers(stmt: Statement): boolean {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        return (
          varDecl.varType.includes("*") ||
          this.containsPointerOperations(varDecl.init)
        );

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;

        if (typeof assignment.target !== "string") {
          return true;
        }
        /* check if target variable is aliased */
        if (!this.canOptimizeVariable(assignment.target)) {
          return true;
        }
        return this.containsPointerOperations(assignment.value);

      case NodeType.ExpressionStatement:
        return this.containsPointerOperations(
          (stmt as ExpressionStatement).expression,
        );

      case NodeType.ReturnStatement:
        return this.containsPointerOperations(
          (stmt as ReturnStatement).argument,
        );

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        return this.containsPointerOperations(ifStmt.condition);

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        return this.containsPointerOperations(whileStmt.condition);

      default:
        return false;
    }
  }

  private findFunctionCalls(func: FunctionDeclaration): string[] {
    const calls: string[] = [];

    const findCallsInExpression = (expr: Expression): void => {
      if (expr.type === NodeType.FunctionCall) {
        const funcCall = expr as FunctionCall;
        calls.push(funcCall.callee);
        funcCall.arguments.forEach(findCallsInExpression);
      } else if (expr.type === NodeType.BinaryExpression) {
        const binExpr = expr as BinaryExpression;
        findCallsInExpression(binExpr.left);
        findCallsInExpression(binExpr.right);
      } else if (expr.type === NodeType.UnaryExpression) {
        const unaryExpr = expr as UnaryExpression;
        findCallsInExpression(unaryExpr.operand);
      }
    };

    const findCallsInStatement = (stmt: Statement): void => {
      switch (stmt.type) {
        case NodeType.ExpressionStatement:
          findCallsInExpression((stmt as ExpressionStatement).expression);
          break;
        case NodeType.ReturnStatement:
          findCallsInExpression((stmt as ReturnStatement).argument);
          break;
        case NodeType.VariableDeclaration:
          findCallsInExpression((stmt as VariableDeclaration).init);
          break;
        case NodeType.AssignmentStatement:
          findCallsInExpression((stmt as AssignmentStatement).value);
          break;
        case NodeType.IfStatement:
          const ifStmt = stmt as IfStatement;
          findCallsInExpression(ifStmt.condition);
          findCallsInStatement(ifStmt.thenBranch);
          if (ifStmt.elseBranch) {
            findCallsInStatement(ifStmt.elseBranch);
          }
          break;
        case NodeType.WhileStatement:
          const whileStmt = stmt as WhileStatement;
          findCallsInExpression(whileStmt.condition);
          findCallsInStatement(whileStmt.body);
          break;
        case NodeType.BlockStatement:
          (stmt as BlockStatement).statements.forEach(findCallsInStatement);
          break;
      }
    };

    findCallsInStatement(func.body);
    return calls;
  }

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
        /* anything after return is dead */
        this.currentPassStats.deadCodeElimination++;
        this.phaseChanged = true;

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
    if (this.statementInvolvesPointers(stmt)) {
      return stmt;
    }

    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        if (
          !this.usedVariables.has(varDecl.name) &&
          !this.hasSideEffects(varDecl.init) &&
          this.canOptimizeVariable(varDecl.name)
        ) {
          /* dead store elimination (unused variable declarations) */
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;

          return null;
        }
        return stmt;

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        if (
          typeof assignment.target === "string" &&
          !this.usedVariables.has(assignment.target) &&
          !this.hasSideEffects(assignment.value) &&
          this.canOptimizeVariable(assignment.target)
        ) {
          /* dead assignment elimination (assignments to unused variables) */
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;

          return null;
        }
        return stmt;

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        const condition = ifStmt.condition;
        if (
          condition.type === NodeType.NumberLiteral &&
          !this.containsPointerOperations(condition)
        ) {
          /* branch elimination based on constant conditions */
          const condValue = (condition as NumberLiteral).value;
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          if (condValue !== 0) {
            return this.cfStatement(ifStmt.thenBranch);
          } else {
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
          /* pure expression elimination */
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          return null;
        }
        return stmt;

      default:
        return stmt;
    }
  }

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
    if (this.statementInvolvesPointers(stmt)) {
      return stmt;
    }

    switch (stmt.type) {
      case NodeType.VariableDeclaration: {
        const varDecl = stmt as VariableDeclaration;
        const init = this.cpExpression(varDecl.init);

        if (
          init.type === NodeType.NumberLiteral &&
          this.canOptimizeVariable(varDecl.name)
        ) {
          this.constantValues[varDecl.name] = (init as NumberLiteral).value;
        }

        return {
          ...varDecl,
          init,
        };
      }
      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        const value = this.cpExpression(assignment.value);

        if (
          typeof assignment.target === "string" &&
          this.canOptimizeVariable(assignment.target)
        ) {
          if (value.type === NodeType.NumberLiteral) {
            this.constantValues[assignment.target] = (
              value as NumberLiteral
            ).value;
          } else {
            /* non-constant assignment invalidates previous constant value */
            delete this.constantValues[assignment.target];
          }
        }

        return {
          ...assignment,
          value,
        };

      case NodeType.IfStatement: {
        const ifStmt = stmt as IfStatement;
        const condition = this.cpExpression(ifStmt.condition);

        /* constant condition enables branch elimination */
        if (condition.type === NodeType.NumberLiteral) {
          const condValue = (condition as NumberLiteral).value;
          this.currentPassStats.constantPropagation++;
          this.phaseChanged = true;

          if (condValue !== 0) {
            /* always true so only process then branch */
            return this.cpStatement(ifStmt.thenBranch);
          } else {
            /* else only process else branch */

            return ifStmt.elseBranch
              ? this.cpStatement(ifStmt.elseBranch)
              : { type: NodeType.BlockStatement, statements: [] };
          }
        }

        /* ssa style merging variables constant on both paths remain constant */
        const savedConstants = { ...this.constantValues };

        const thenBranch = this.cpStatement(ifStmt.thenBranch);
        const thenConstants = { ...this.constantValues };

        /*restore state and process else branch*/
        this.constantValues = { ...savedConstants };
        const elseBranch = ifStmt.elseBranch
          ? this.cpStatement(ifStmt.elseBranch)
          : null;
        const elseConstants = { ...this.constantValues };

        /* merge constant states */
        this.constantValues = {};
        for (const varName in savedConstants) {
          const originalValue = savedConstants[varName];
          const thenValue = thenConstants[varName];
          const elseValue = elseConstants[varName];

          /*keep variables that have same constant value in both branches*/
          if (
            thenValue !== undefined &&
            elseValue !== undefined &&
            thenValue === elseValue
          ) {
            this.constantValues[varName] = thenValue;
          } else if (
            !ifStmt.elseBranch &&
            thenValue !== undefined &&
            thenValue === originalValue
          ) {
            /* no else branch and value unchanged in then branch */
            this.constantValues[varName] = originalValue;
          } else if (!ifStmt.elseBranch && originalValue !== undefined) {
            /* no else branch so keep unmodified variables */
            if (
              !(varName in thenConstants) ||
              thenConstants[varName] === originalValue
            ) {
              this.constantValues[varName] = originalValue;
            }
          }
        }

        return {
          ...ifStmt,
          condition,
          thenBranch,
          elseBranch,
        };
      }

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;

        /* variables modified in loop cannot be treated as constants */
        const modifiedVars = this.getModifiedVariables(whileStmt.body);

        /* variables used in condition that are modified in body lose constant status */
        const conditionVars = this.getVariablesInExpression(
          whileStmt.condition,
        );

        const savedConstants: { [key: string]: number | undefined } = {};
        for (const condVar of conditionVars) {
          if (modifiedVars.has(condVar)) {
            savedConstants[condVar] = this.constantValues[condVar];
            delete this.constantValues[condVar];
          }
        }

        /* process condition without treating loop-modified variables as constants */
        const condition = this.cpExpression(whileStmt.condition);

        /* remove loop-modified variables from constant tracking */
        for (const modVar of modifiedVars) {
          if (this.canOptimizeVariable(modVar)) {
            delete this.constantValues[modVar];
          }
        }

        const body = this.cpStatement(whileStmt.body);

        return {
          ...whileStmt,
          condition,
          body,
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
    if (this.containsPointerOperations(expr)) {
      return expr;
    }

    switch (expr.type) {
      case NodeType.Identifier:
        const id = expr as Identifier;
        if (
          this.constantValues.hasOwnProperty(id.name) &&
          this.constantValues[id.name] !== undefined &&
          this.canOptimizeVariable(id.name)
        ) {
          /* variable-constant replacement */
          this.currentPassStats.constantPropagation++;
          this.phaseChanged = true;

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

        return {
          ...funcCall,
          arguments: funcCall.arguments.map((arg) => this.cpExpression(arg)),
        };

      default:
        return expr;
    }
  }

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
    if (this.statementInvolvesPointers(stmt)) {
      return stmt;
    }

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

        const modifiedVars = this.getModifiedVariables(whileStmt.body);

        const savedConstants: { [key: string]: number | undefined } = {};
        for (const modVar of modifiedVars) {
          if (this.canOptimizeVariable(modVar)) {
            savedConstants[modVar] = this.constantValues[modVar];
            delete this.constantValues[modVar];
          }
        }

        const whileCondition = this.cfExpression(whileStmt.condition);

        /* dce while(0) can be removed entirely */
        if (
          whileCondition.type === NodeType.NumberLiteral &&
          !this.containsPointerOperations(whileCondition)
        ) {
          const condValue = (whileCondition as NumberLiteral).value;
          if (condValue === 0) {
            this.currentPassStats.deadCodeElimination++;
            this.phaseChanged = true;

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
    if (this.containsPointerOperations(expr)) {
      return expr;
    }

    switch (expr.type) {
      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        const left = this.cfExpression(binExpr.left);
        const right = this.cfExpression(binExpr.right);

        const simplified = this.algebraicSimplify(
          binExpr.operator,
          left,
          right,
        );
        if (simplified) {
          return simplified;
        }

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
    /* addition/subtraction identity: x + 0 = x, x - 0 = x */
    if (
      (operator === "+" || operator === "-") &&
      right.type === NodeType.NumberLiteral &&
      (right as NumberLiteral).value === 0
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;

      return left;
    }

    /* addition commutativity: 0 + x = x */
    if (
      operator === "+" &&
      left.type === NodeType.NumberLiteral &&
      (left as NumberLiteral).value === 0
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;

      return right;
    }

    /* multiplication identity: x * 1 = x */
    if (
      operator === "*" &&
      right.type === NodeType.NumberLiteral &&
      (right as NumberLiteral).value === 1
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;

      return left;
    }

    /* multiplication commutativity: 1 * x = x */
    if (
      operator === "*" &&
      left.type === NodeType.NumberLiteral &&
      (left as NumberLiteral).value === 1
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;

      return right;
    }

    /* multiplication by zero: x * 0 = 0, 0 * x = 0 */
    if (
      operator === "*" &&
      ((left.type === NodeType.NumberLiteral &&
        (left as NumberLiteral).value === 0) ||
        (right.type === NodeType.NumberLiteral &&
          (right as NumberLiteral).value === 0))
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;

      return { type: NodeType.NumberLiteral, value: 0 };
    }

    /* division identity: x / 1 = x */
    if (
      operator === "/" &&
      right.type === NodeType.NumberLiteral &&
      (right as NumberLiteral).value === 1
    ) {
      this.currentPassStats.algebraicSimplification++;
      this.phaseChanged = true;

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
      case NodeType.UnaryExpression:
        const unaryExpr = expr as UnaryExpression;
        this.collectUsedVariablesInExpression(unaryExpr.operand);
        break;
      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        for (const arg of funcCall.arguments) {
          this.collectUsedVariablesInExpression(arg);
        }
        break;
    }
  }

  /* side effect analysis with interprocedural awareness */
  private hasSideEffects(expr: Expression): boolean {
    switch (expr.type) {
      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;

        const calledFunction = this.program.functions.find(
          (f) => f.name === funcCall.callee,
        );
        if (calledFunction) {
          /* could be much more thorough*/
          if (this.isPureUserFunction(calledFunction)) {
            return false;
          }
        }

        /* i/o functions and system calls definitely have side effects */
        if (["printf", "exit"].includes(funcCall.callee)) {
          return true;
        }

        return true;

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        return (
          this.hasSideEffects(binExpr.left) ||
          this.hasSideEffects(binExpr.right)
        );
      case NodeType.UnaryExpression:
        const unaryExpr = expr as UnaryExpression;
        /* address-of and dereference operations don't have side effects themselves */
        return this.hasSideEffects(unaryExpr.operand);
      default:
        return false;
    }
  }

  /* heuristic approach, could be more more thorough */
  private isPureUserFunction(func: FunctionDeclaration): boolean {
    if (func.params.some((p) => p.paramType.includes("*"))) {
      return false;
    }
    if (func.returnType === "void") {
      return false;
    }

    return this.containsOnlyPureOperations(func.body);
  }

  private containsOnlyPureOperations(stmt: Statement): boolean {
    switch (stmt.type) {
      case NodeType.BlockStatement:
        const block = stmt as BlockStatement;
        return block.statements.every((s) =>
          this.containsOnlyPureOperations(s),
        );

      case NodeType.ReturnStatement:
        const returnStmt = stmt as ReturnStatement;
        return !this.hasSideEffects(returnStmt.argument);

      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        return !this.hasSideEffects(varDecl.init);

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        return (
          typeof assignment.target === "string" &&
          !this.hasSideEffects(assignment.value)
        );

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        return (
          !this.hasSideEffects(ifStmt.condition) &&
          this.containsOnlyPureOperations(ifStmt.thenBranch) &&
          (!ifStmt.elseBranch ||
            this.containsOnlyPureOperations(ifStmt.elseBranch))
        );

      case NodeType.ExpressionStatement:
        return !this.hasSideEffects((stmt as ExpressionStatement).expression);

      default:
        return false;
    }
  }

  private getModifiedVariables(stmt: Statement): Set<string> {
    const modified = new Set<string>();

    const traverse = (node: Statement | Expression): void => {
      if (!node) return;

      switch (node.type) {
        case NodeType.AssignmentStatement:
          const assignment = node as AssignmentStatement;
          if (typeof assignment.target === "string") {
            modified.add(assignment.target);
          }
          traverse(assignment.value);
          break;

        case NodeType.VariableDeclaration:
          const varDecl = node as VariableDeclaration;
          modified.add(varDecl.name);
          traverse(varDecl.init);
          break;

        case NodeType.BlockStatement:
          const block = node as BlockStatement;
          block.statements.forEach(traverse);
          break;

        case NodeType.IfStatement:
          const ifStmt = node as IfStatement;
          traverse(ifStmt.condition);
          traverse(ifStmt.thenBranch);
          if (ifStmt.elseBranch) traverse(ifStmt.elseBranch);
          break;

        case NodeType.WhileStatement:
          const whileStmt = node as WhileStatement;
          traverse(whileStmt.condition);
          traverse(whileStmt.body);
          break;

        case NodeType.ExpressionStatement:
          const exprStmt = node as ExpressionStatement;
          traverse(exprStmt.expression);
          break;

        case NodeType.ReturnStatement:
          const returnStmt = node as ReturnStatement;
          traverse(returnStmt.argument);
          break;

        case NodeType.BinaryExpression:
          const binExpr = node as BinaryExpression;
          traverse(binExpr.left);
          traverse(binExpr.right);
          break;

        case NodeType.UnaryExpression:
          const unaryExpr = node as UnaryExpression;
          traverse(unaryExpr.operand);
          break;

        case NodeType.FunctionCall:
          const funcCall = node as FunctionCall;
          funcCall.arguments.forEach(traverse);
          break;

        default:
          break;
      }
    };

    traverse(stmt);
    return modified;
  }

  private getVariablesInExpression(expr: Expression): Set<string> {
    const variables = new Set<string>();

    const traverse = (node: Expression): void => {
      if (!node) return;

      switch (node.type) {
        case NodeType.Identifier:
          const id = node as Identifier;
          variables.add(id.name);
          break;

        case NodeType.BinaryExpression:
          const binExpr = node as BinaryExpression;
          traverse(binExpr.left);
          traverse(binExpr.right);
          break;

        case NodeType.UnaryExpression:
          const unaryExpr = node as UnaryExpression;
          traverse(unaryExpr.operand);
          break;

        case NodeType.FunctionCall:
          const funcCall = node as FunctionCall;
          funcCall.arguments.forEach(traverse);
          break;

        default:
          break;
      }
    };

    traverse(expr);
    return variables;
  }

  private deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}
