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
  pointersDetected: number; // Track pointer detection for conservative analysis
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

  /* Pointer safety tracking - essential for correctness in presence of aliasing */
  private hasPointers: boolean = false;
  private pointerVariables!: Set<string>; // Variables declared as pointer types
  private pointerReferencedVariables!: Set<string>; // Variables with address taken (&var)

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

  functionQueue: FunctionDeclaration[] = [];
  _program!: Program;

  /* Multi-pass optimization with fixed-point iteration - continues until no changes */
  optimize(
    program: Program,
    maxPasses: number = 10,
  ): { optimized: Program; stats: OptimizationStats } {
    this.resetStats();

    let currentProgram = this.deepClone(program);
    this._program = currentProgram;

    /* Phase 0: Conservative pointer analysis - disables optimization for aliased memory */
    console.log("\n=== Pointer Detection Phase ===");
    this.detectPointers(currentProgram);

    if (this.hasPointers) {
      console.log(
        `Pointers detected! Found pointer variables: ${Array.from(this.pointerVariables).join(", ")}`,
      );
      console.log(
        `Variables with address taken: ${Array.from(this.pointerReferencedVariables).join(", ")}`,
      );
      console.log("Optimization will be DISABLED for pointer-related code");
      this.stats.pointersDetected =
        this.pointerVariables.size + this.pointerReferencedVariables.size;
    } else {
      console.log("No pointers detected, full optimization enabled");
    }

    let passChanged = true;

    /* Fixed-point iteration - real compilers use worklist algorithms for efficiency */
    while (passChanged && this.stats.passes < maxPasses) {
      this.stats.passes++;
      this.resetPassStats();
      console.log(`\n=== Pass ${this.stats.passes} ===`);

      passChanged = false;

      /* Phase ordering crucial - DCE enables more optimization, CP+CF work together */

      // Phase 1: Dead Code Elimination - removes unused variables and unreachable code
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

      // Phase 2: Constant Propagation - replaces variable uses with their constant values
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

      // Phase 3: Constant Folding & Algebraic Simplification - evaluates constant expressions
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

      // Update cumulative statistics
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

    /* Phase 4: Dead Function Elimination - call graph analysis starting from main */
    console.log("\n=== Dead Function Elimination ===");

    if (currentProgram.functions.length === 0) {
      throw new Error("Program needs at least one function");
    }

    // Find and validate main function exists - entry point for call graph traversal
    const mainFunction = currentProgram.functions.find(
      (f) => f.name === "main",
    );
    if (!mainFunction) {
      throw new Error("Program needs a main function");
    }

    /* BFS traversal of call graph - more systematic than recursive approach */
    const calledFunctions = new Set<string>();
    const functionQueue: FunctionDeclaration[] = [mainFunction];

    // Process function call graph using BFS
    while (functionQueue.length > 0) {
      const currentFunction = functionQueue.shift()!;

      // Skip if already processed - avoids infinite recursion
      if (calledFunctions.has(currentFunction.name)) {
        continue;
      }

      calledFunctions.add(currentFunction.name);
      console.log(`Processing function: ${currentFunction.name}`);

      // Find any function calls in this function and add to queue
      this.findFunctionCalls(currentFunction).forEach((funcName) => {
        const calledFunc = currentProgram.functions.find(
          (f) => f.name === funcName,
        );
        if (calledFunc && !calledFunctions.has(funcName)) {
          functionQueue.push(calledFunc);
        }
      });
    }

    // Calculate and apply function removal
    const originalFunctionCount = currentProgram.functions.length;
    const removedFunctions = currentProgram.functions
      .filter((f) => !calledFunctions.has(f.name))
      .map((f) => f.name);

    if (removedFunctions.length > 0) {
      console.log(`Removing unused functions: ${removedFunctions.join(", ")}`);
    }

    currentProgram.functions = currentProgram.functions.filter((f) =>
      calledFunctions.has(f.name),
    );

    this.stats.functionsRemoved = originalFunctionCount - calledFunctions.size;

    console.log(`Functions kept: ${Array.from(calledFunctions).join(", ")}`);
    console.log(`Functions removed: ${this.stats.functionsRemoved}`);

    return { optimized: currentProgram, stats: { ...this.stats } };
  }

  // =================== POINTER DETECTION ===================

  /* Conservative pointer analysis - errs on side of safety to prevent incorrect optimization */
  private detectPointers(program: Program): void {
    this.hasPointers = false;
    this.pointerVariables.clear();
    this.pointerReferencedVariables.clear();

    for (const func of program.functions) {
      this.detectPointersInFunction(func);
    }
  }

  private detectPointersInFunction(func: FunctionDeclaration): void {
    // Check if return type is a pointer
    if (func.returnType.includes("*")) {
      this.hasPointers = true;
      console.log(
        `  Function ${func.name} returns pointer type: ${func.returnType}`,
      );
    }

    // Check parameter types - function signatures define pointer semantics
    for (const param of func.params) {
      if (param.paramType.includes("*")) {
        this.hasPointers = true;
        this.pointerVariables.add(param.name);
        console.log(
          `  Parameter ${param.name} is pointer type: ${param.paramType}`,
        );
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
          console.log(
            `  Variable ${varDecl.name} is pointer type: ${varDecl.varType}`,
          );
        }
        this.detectPointersInExpression(varDecl.init);
        break;

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        if (typeof assignment.target !== "string") {
          /* Dereferenced pointer assignment (*ptr = value) - indicates pointer usage */
          this.hasPointers = true;
          console.log(
            `  Found dereferenced pointer assignment: *${(assignment.target as UnaryExpression).operand}`,
          );
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
          /* Address-of operation (&var) - marks variable as having escaped address */
          if (unaryExpr.operand.type === NodeType.Identifier) {
            const varName = (unaryExpr.operand as Identifier).name;
            this.pointerReferencedVariables.add(varName);
            console.log(`  Address taken of variable: ${varName}`);
          }
        } else if (unaryExpr.operator === "*") {
          /* Dereference operation (*ptr) - indicates pointer usage */
          console.log(`  Found pointer dereference operation`);
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

      /* Identifier and NumberLiteral are safe by themselves */
      default:
        break;
    }
  }

  // =================== POINTER-SAFE OPTIMIZATION CHECKS ===================

  /* Aliasing analysis - determines if variable can be safely optimized */
  private canOptimizeVariable(varName: string): boolean {
    if (!this.hasPointers) return true;

    const isPointer = this.pointerVariables.has(varName);
    const hasAddressTaken = this.pointerReferencedVariables.has(varName);

    if (isPointer || hasAddressTaken) {
      console.log(
        `  Skipping optimization of variable '${varName}' (${isPointer ? "is pointer" : "address taken"})`,
      );
      return false;
    }

    return true;
  }

  /* May-alias analysis for expressions - conservative approach */
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

  /* Statement-level aliasing check - prevents optimization of aliased memory */
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
        /* Check if target is a dereferenced pointer (*ptr = value) */
        if (typeof assignment.target !== "string") {
          return true;
        }
        /* Check if target variable is aliased */
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

  // =================== OPTIMIZATION PHASES ===================

  /* Function call discovery - builds call graph for dead function elimination */
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

  /* Dead Code Elimination - removes unused variables and unreachable statements */
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
        /* Unreachable code elimination - anything after return is dead */
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
    /* Conservative approach - skip optimization of pointer-related code */
    if (this.statementInvolvesPointers(stmt)) {
      console.log(`  DCE: Skipping pointer-related statement`);
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
          /* Dead store elimination - unused variable declarations */
          this.currentPassStats.deadCodeElimination++;
          this.phaseChanged = true;
          console.log(`  DCE: Removed unused variable '${varDecl.name}'`);
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
          /* Dead assignment elimination - assignments to unused variables */
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
        if (
          condition.type === NodeType.NumberLiteral &&
          !this.containsPointerOperations(condition)
        ) {
          /* Branch elimination based on constant conditions */
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
          /* Pure expression elimination - expressions without side effects */
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

  /* Constant Propagation - replaces variable uses with their constant values */
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
    /* Conservative approach - avoid propagating into pointer-related code */
    if (this.statementInvolvesPointers(stmt)) {
      console.log(`  CP: Skipping pointer-related statement`);
      return stmt;
    }

    switch (stmt.type) {
      case NodeType.VariableDeclaration: {
        const varDecl = stmt as VariableDeclaration;
        const init = this.cpExpression(varDecl.init);

        /* Track constant values for subsequent propagation */
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

        /* Update constant tracking based on assignment */
        if (
          typeof assignment.target === "string" &&
          this.canOptimizeVariable(assignment.target)
        ) {
          if (value.type === NodeType.NumberLiteral) {
            this.constantValues[assignment.target] = (
              value as NumberLiteral
            ).value;
          } else {
            /* Non-constant assignment invalidates previous constant value */
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

        /* Conditional constant propagation - constant condition enables branch elimination */
        if (condition.type === NodeType.NumberLiteral) {
          const condValue = (condition as NumberLiteral).value;
          this.currentPassStats.constantPropagation++;
          this.phaseChanged = true;

          if (condValue !== 0) {
            /* True condition - only process then branch */
            console.log(
              `  CP: Condition always true, processing only then branch`,
            );
            return this.cpStatement(ifStmt.thenBranch);
          } else {
            /* False condition - only process else branch */
            console.log(
              `  CP: Condition always false, processing only else branch`,
            );
            return ifStmt.elseBranch
              ? this.cpStatement(ifStmt.elseBranch)
              : { type: NodeType.BlockStatement, statements: [] };
          }
        }

        /* SSA-style merging - variables constant on both paths remain constant */
        const savedConstants = { ...this.constantValues };

        // Process then branch
        const thenBranch = this.cpStatement(ifStmt.thenBranch);
        const thenConstants = { ...this.constantValues };

        // Restore state and process else branch
        this.constantValues = { ...savedConstants };
        const elseBranch = ifStmt.elseBranch
          ? this.cpStatement(ifStmt.elseBranch)
          : null;
        const elseConstants = { ...this.constantValues };

        /* Merge constant states - conservative approach */
        this.constantValues = {};
        for (const varName in savedConstants) {
          const originalValue = savedConstants[varName];
          const thenValue = thenConstants[varName];
          const elseValue = elseConstants[varName];

          // Keep variables that have same constant value in both branches
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
            /* No else branch and value unchanged in then branch */
            this.constantValues[varName] = originalValue;
          } else if (!ifStmt.elseBranch && originalValue !== undefined) {
            /* No else branch - keep unmodified variables */
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

        /* Loop analysis - variables modified in loop cannot be treated as constants */
        const modifiedVars = this.getModifiedVariables(whileStmt.body);

        /* Variables used in condition that are modified in body lose constant status */
        const conditionVars = this.getVariablesInExpression(
          whileStmt.condition,
        );

        /* Conservative invalidation of loop-modified variables in condition */
        const savedConstants: { [key: string]: number | undefined } = {};
        for (const condVar of conditionVars) {
          if (modifiedVars.has(condVar)) {
            savedConstants[condVar] = this.constantValues[condVar];
            delete this.constantValues[condVar];
          }
        }

        /* Process condition without treating loop-modified variables as constants */
        const condition = this.cpExpression(whileStmt.condition);

        /* Remove ALL loop-modified variables from constant tracking */
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
    /* Conservative approach - avoid propagating through pointer operations */
    if (this.containsPointerOperations(expr)) {
      console.log(`  CP: Skipping pointer-related expression`);
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
          /* Variable-to-constant replacement - core of constant propagation */
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

        return {
          ...funcCall,
          arguments: funcCall.arguments.map((arg) => this.cpExpression(arg)),
        };

      default:
        return expr;
    }
  }

  /* Constant Folding & Algebraic Simplification - evaluates constant expressions */
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
    /* Conservative approach - avoid folding pointer-related expressions */
    if (this.statementInvolvesPointers(stmt)) {
      console.log(`  CF: Skipping pointer-related statement`);
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

        /* Remove loop-modified variables from constant tracking */
        const modifiedVars = this.getModifiedVariables(whileStmt.body);

        /* Conservative invalidation - variables modified in loop lose constant status */
        const savedConstants: { [key: string]: number | undefined } = {};
        for (const modVar of modifiedVars) {
          if (this.canOptimizeVariable(modVar)) {
            savedConstants[modVar] = this.constantValues[modVar];
            delete this.constantValues[modVar];
          }
        }

        const whileCondition = this.cfExpression(whileStmt.condition);

        /* Dead loop elimination - while(0) can be removed entirely */
        if (
          whileCondition.type === NodeType.NumberLiteral &&
          !this.containsPointerOperations(whileCondition)
        ) {
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
    /* Conservative approach - avoid folding expressions with pointer operations */
    if (this.containsPointerOperations(expr)) {
      console.log(`  CF: Skipping pointer-related expression`);
      return expr;
    }

    switch (expr.type) {
      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        const left = this.cfExpression(binExpr.left);
        const right = this.cfExpression(binExpr.right);

        /* Algebraic simplification before constant folding - catches more cases */
        const simplified = this.algebraicSimplify(
          binExpr.operator,
          left,
          right,
        );
        if (simplified) {
          return simplified;
        }

        /* Constant folding - compile-time evaluation of constant expressions */
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
              /* Integer division - matches C semantics */
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

  /* Algebraic simplification - strength reduction and identity elimination */
  private algebraicSimplify(
    operator: string,
    left: Expression,
    right: Expression,
  ): Expression | null {
    /* Addition/subtraction identity: x + 0 = x, x - 0 = x */
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

    /* Addition commutativity: 0 + x = x */
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

    /* Multiplication identity: x * 1 = x */
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

    /* Multiplication commutativity: 1 * x = x */
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

    /* Multiplication by zero: x * 0 = 0, 0 * x = 0 */
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

    /* Division identity: x / 1 = x */
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

  /* Liveness analysis - determines which variables are actually used */
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

  /* Pure function whitelist - functions known to have no side effects */
  private readonly pureFunctions = new Set([
    "abs",
    "max",
    "min",
    "sqrt",
    "pow",
    "sin",
    "cos",
    "tan",
    "floor",
    "ceil",
    "round",
    "log",
    "exp",
    "fabs",
    "strlen",
  ]);

  /* Side effect analysis with interprocedural awareness */
  private hasSideEffects(expr: Expression): boolean {
    switch (expr.type) {
      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;

        /* Mathematical and string utility functions are typically pure */
        if (this.pureFunctions.has(funcCall.callee)) {
          console.log(`  Pure function detected: ${funcCall.callee}`);
          return false;
        }

        /* User-defined functions: check if they modify global state */
        const calledFunction = this._program.functions.find(
          (f) => f.name === funcCall.callee,
        );
        if (calledFunction) {
          /* Quick heuristic: functions that only do arithmetic and return values are likely pure */
          if (this.isPureUserFunction(calledFunction)) {
            console.log(`  User function appears pure: ${funcCall.callee}`);
            return false;
          }
        }

        /* I/O functions and system calls - definitely have side effects */
        if (
          ["printf", "scanf", "exit", "malloc", "free"].includes(
            funcCall.callee,
          )
        ) {
          return true;
        }

        /* Conservative fallback - unknown functions assumed to have side effects */
        return true;

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        return (
          this.hasSideEffects(binExpr.left) ||
          this.hasSideEffects(binExpr.right)
        );
      case NodeType.UnaryExpression:
        const unaryExpr = expr as UnaryExpression;
        /* Address-of and dereference operations don't have side effects themselves */
        return this.hasSideEffects(unaryExpr.operand);
      default:
        return false;
    }
  }

  /* Heuristic analysis for user-defined function purity */
  private isPureUserFunction(func: FunctionDeclaration): boolean {
    /* Functions with pointer parameters likely modify external state */
    if (func.params.some((p) => p.paramType.includes("*"))) {
      return false;
    }

    /* Functions that return void likely have side effects */
    if (func.returnType === "void") {
      return false;
    }

    /* Quick scan: does function contain only arithmetic and return? */
    return this.containsOnlyPureOperations(func.body);
  }

  /* Check if statement block contains only pure operations */
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
        /* Local variable declarations with pure initializers are OK */
        return !this.hasSideEffects(varDecl.init);

      case NodeType.AssignmentStatement:
        const assignment = stmt as AssignmentStatement;
        /* Assignments to local variables with pure RHS are OK */
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
        /* Pure expression statements are rare but possible */
        return !this.hasSideEffects((stmt as ExpressionStatement).expression);

      default:
        /* Loops and other complex control flow - conservatively assume impure */
        return false;
    }
  }

  /* Def-use analysis; finds variables modified by statement */
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

  /* Variable reference analysis; finds all variables referenced in expression */
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
