// src/enhanced-optimizer.ts
import {
  AssignmentStatement,
  BinaryExpression,
  BlockStatement,
  Expression,
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

// Control Flow Graph representation
export interface BasicBlock {
  id: number;
  statements: Statement[];
  predecessors: Set<number>;
  successors: Set<number>;
  dominators?: Set<number>;
  dominanceFrontier?: Set<number>;
}

export interface ControlFlowGraph {
  blocks: Map<number, BasicBlock>;
  entry: number;
  exit: number;
}

// Data flow analysis structures
export interface DefUseChain {
  variable: string;
  definitions: Set<number>; // Block IDs where variable is defined
  uses: Set<number>; // Block IDs where variable is used
}

export interface LivenessInfo {
  liveIn: Set<string>;
  liveOut: Set<string>;
  def: Set<string>;
  use: Set<string>;
}

export interface OptimizationStats {
  constantFolding: number;
  deadCodeElimination: number;
  algebraicSimplification: number;
  constantPropagation: number;
  deadStoreElimination: number;
  passes: number;
}

export class EnhancedOptimizer {
  private stats: OptimizationStats = {
    constantFolding: 0,
    deadCodeElimination: 0,
    algebraicSimplification: 0,
    constantPropagation: 0,
    deadStoreElimination: 0,
    passes: 0,
  };

  private nextBlockId = 0;

  optimize(
    program: Program,
    maxPasses: number = 10,
  ): { optimized: Program; stats: OptimizationStats } {
    this.stats = {
      constantFolding: 0,
      deadCodeElimination: 0,
      algebraicSimplification: 0,
      constantPropagation: 0,
      deadStoreElimination: 0,
      passes: 0,
    };

    let currentProgram = program;
    let changed = true;
    let pass = 0;

    // Iterative optimization until convergence or max passes
    while (changed && pass < maxPasses) {
      changed = false;
      pass++;
      this.stats.passes = pass;

      console.log(`Starting optimization pass ${pass}`);

      const optimizedFunctions = currentProgram.functions.map((func) => {
        const result = this.optimizeFunction(func);
        if (JSON.stringify(result) !== JSON.stringify(func)) {
          changed = true;
        }
        return result;
      });

      currentProgram = {
        type: NodeType.Program,
        functions: optimizedFunctions,
      };

      console.log(`Pass ${pass} completed. Changed: ${changed}`);
    }

    console.log(`Optimization converged after ${pass} passes`);
    return { optimized: currentProgram, stats: { ...this.stats } };
  }

  private optimizeFunction(func: FunctionDeclaration): FunctionDeclaration {
    // Build CFG
    const cfg = this.buildControlFlowGraph(func.body);

    // Perform data flow analysis
    const livenessInfo = this.computeLiveness(cfg);
    const defUseChains = this.buildDefUseChains(cfg);

    // Apply optimizations in order of effectiveness
    let optimizedBody = func.body;

    // 1. Constant propagation (often enables other optimizations)
    optimizedBody = this.constantPropagation(optimizedBody, cfg);

    // 2. Algebraic simplification and constant folding
    optimizedBody = this.algebraicOptimizations(optimizedBody);

    // 3. Dead code elimination (should come after constant prop)
    optimizedBody = this.deadCodeElimination(optimizedBody, livenessInfo);

    // 4. Dead store elimination
    optimizedBody = this.deadStoreElimination(optimizedBody, livenessInfo);

    return {
      ...func,
      body: optimizedBody,
    };
  }

  private buildControlFlowGraph(block: BlockStatement): ControlFlowGraph {
    const cfg: ControlFlowGraph = {
      blocks: new Map(),
      entry: 0,
      exit: -1,
    };

    this.nextBlockId = 0;
    const entryBlock = this.createBasicBlock();
    cfg.entry = entryBlock.id;
    cfg.blocks.set(entryBlock.id, entryBlock);

    this.buildCFGFromStatements(block.statements, entryBlock, cfg);

    // Create exit block if needed
    const exitBlock = this.createBasicBlock();
    cfg.exit = exitBlock.id;
    cfg.blocks.set(exitBlock.id, exitBlock);

    // Connect blocks that don't have successors to exit
    for (const [blockId, block] of cfg.blocks) {
      if (block.successors.size === 0 && blockId !== cfg.exit) {
        this.addEdge(cfg, blockId, cfg.exit);
      }
    }

    return cfg;
  }

  private buildCFGFromStatements(
    statements: Statement[],
    currentBlock: BasicBlock,
    cfg: ControlFlowGraph,
  ): BasicBlock {
    for (const stmt of statements) {
      if (this.isControlFlowStatement(stmt)) {
        // Handle control flow statements
        if (stmt.type === NodeType.IfStatement) {
          const ifStmt = stmt as IfStatement;

          // Add the if statement to current block
          currentBlock.statements.push(stmt);

          // Create blocks for then and else branches
          const thenBlock = this.createBasicBlock();
          const elseBlock = this.createBasicBlock();
          const mergeBlock = this.createBasicBlock();

          cfg.blocks.set(thenBlock.id, thenBlock);
          cfg.blocks.set(elseBlock.id, elseBlock);
          cfg.blocks.set(mergeBlock.id, mergeBlock);

          // Connect current block to branches
          this.addEdge(cfg, currentBlock.id, thenBlock.id);
          this.addEdge(cfg, currentBlock.id, elseBlock.id);

          // Process branch statements
          if (ifStmt.thenBranch.type === NodeType.BlockStatement) {
            this.buildCFGFromStatements(
              (ifStmt.thenBranch as BlockStatement).statements,
              thenBlock,
              cfg,
            );
          } else {
            thenBlock.statements.push(ifStmt.thenBranch);
          }

          if (ifStmt.elseBranch) {
            if (ifStmt.elseBranch.type === NodeType.BlockStatement) {
              this.buildCFGFromStatements(
                (ifStmt.elseBranch as BlockStatement).statements,
                elseBlock,
                cfg,
              );
            } else {
              elseBlock.statements.push(ifStmt.elseBranch);
            }
          }

          // Connect branches to merge block
          this.addEdge(cfg, thenBlock.id, mergeBlock.id);
          this.addEdge(cfg, elseBlock.id, mergeBlock.id);

          return mergeBlock;
        } else if (stmt.type === NodeType.WhileStatement) {
          const whileStmt = stmt as WhileStatement;

          // Create loop header, body, and exit blocks
          const headerBlock = this.createBasicBlock();
          const bodyBlock = this.createBasicBlock();
          const exitBlock = this.createBasicBlock();

          cfg.blocks.set(headerBlock.id, headerBlock);
          cfg.blocks.set(bodyBlock.id, bodyBlock);
          cfg.blocks.set(exitBlock.id, exitBlock);

          // Add while condition to header
          headerBlock.statements.push(stmt);

          // Connect current to header
          this.addEdge(cfg, currentBlock.id, headerBlock.id);

          // Header connects to body and exit
          this.addEdge(cfg, headerBlock.id, bodyBlock.id);
          this.addEdge(cfg, headerBlock.id, exitBlock.id);

          // Process body
          if (whileStmt.body.type === NodeType.BlockStatement) {
            const lastBodyBlock = this.buildCFGFromStatements(
              (whileStmt.body as BlockStatement).statements,
              bodyBlock,
              cfg,
            );
            // Body loops back to header
            this.addEdge(cfg, lastBodyBlock.id, headerBlock.id);
          } else {
            bodyBlock.statements.push(whileStmt.body);
            this.addEdge(cfg, bodyBlock.id, headerBlock.id);
          }

          return exitBlock;
        }
      } else {
        // Regular statement, add to current block
        currentBlock.statements.push(stmt);

        // If it's a return statement, this block is terminal
        if (stmt.type === NodeType.ReturnStatement) {
          return currentBlock;
        }
      }
    }

    return currentBlock;
  }

  private createBasicBlock(): BasicBlock {
    return {
      id: this.nextBlockId++,
      statements: [],
      predecessors: new Set(),
      successors: new Set(),
    };
  }

  private addEdge(cfg: ControlFlowGraph, from: number, to: number): void {
    const fromBlock = cfg.blocks.get(from);
    const toBlock = cfg.blocks.get(to);

    if (fromBlock && toBlock) {
      fromBlock.successors.add(to);
      toBlock.predecessors.add(from);
    }
  }

  private isControlFlowStatement(stmt: Statement): boolean {
    return (
      stmt.type === NodeType.IfStatement ||
      stmt.type === NodeType.WhileStatement ||
      stmt.type === NodeType.ReturnStatement
    );
  }

  private computeLiveness(cfg: ControlFlowGraph): Map<number, LivenessInfo> {
    const livenessInfo = new Map<number, LivenessInfo>();

    // Initialize liveness info for all blocks
    for (const [blockId, block] of cfg.blocks) {
      livenessInfo.set(blockId, {
        liveIn: new Set(),
        liveOut: new Set(),
        def: new Set(),
        use: new Set(),
      });

      // Compute def/use sets for this block
      this.computeDefUse(block, livenessInfo.get(blockId)!);
    }

    // Fixed point iteration for liveness analysis
    let changed = true;
    while (changed) {
      changed = false;

      // Process blocks in reverse post-order for better convergence
      for (const [blockId, block] of cfg.blocks) {
        const info = livenessInfo.get(blockId)!;
        const oldLiveIn = new Set(info.liveIn);
        const oldLiveOut = new Set(info.liveOut);

        // liveOut[n] = ∪ liveIn[s] for all successors s
        info.liveOut.clear();
        for (const successorId of block.successors) {
          const successorInfo = livenessInfo.get(successorId)!;
          for (const variable of successorInfo.liveIn) {
            info.liveOut.add(variable);
          }
        }

        // liveIn[n] = use[n] ∪ (liveOut[n] - def[n])
        info.liveIn.clear();
        for (const variable of info.use) {
          info.liveIn.add(variable);
        }
        for (const variable of info.liveOut) {
          if (!info.def.has(variable)) {
            info.liveIn.add(variable);
          }
        }

        // Check for changes
        if (
          oldLiveIn.size !== info.liveIn.size ||
          oldLiveOut.size !== info.liveOut.size ||
          !this.setsEqual(oldLiveIn, info.liveIn) ||
          !this.setsEqual(oldLiveOut, info.liveOut)
        ) {
          changed = true;
        }
      }
    }

    return livenessInfo;
  }

  private computeDefUse(block: BasicBlock, info: LivenessInfo): void {
    for (const stmt of block.statements) {
      this.computeStatementDefUse(stmt, info);
    }
  }

  private computeStatementDefUse(stmt: Statement, info: LivenessInfo): void {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        info.def.add(varDecl.name);
        this.computeExpressionUse(varDecl.init, info);
        break;

      case NodeType.AssignmentStatement:
        const assignStmt = stmt as AssignmentStatement;
        info.def.add(assignStmt.target);
        this.computeExpressionUse(assignStmt.value, info);
        break;

      case NodeType.ReturnStatement:
        const returnStmt = stmt as ReturnStatement;
        this.computeExpressionUse(returnStmt.argument, info);
        break;

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        this.computeExpressionUse(ifStmt.condition, info);
        break;

      case NodeType.WhileStatement:
        const whileStmt = stmt as WhileStatement;
        this.computeExpressionUse(whileStmt.condition, info);
        break;
    }
  }

  private computeExpressionUse(expr: Expression, info: LivenessInfo): void {
    switch (expr.type) {
      case NodeType.Identifier:
        const identifier = expr as Identifier;
        if (!info.def.has(identifier.name)) {
          info.use.add(identifier.name);
        }
        break;

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        this.computeExpressionUse(binExpr.left, info);
        this.computeExpressionUse(binExpr.right, info);
        break;

      case NodeType.FunctionCall:
        const funcCall = expr as FunctionCall;
        for (const arg of funcCall.arguments) {
          this.computeExpressionUse(arg, info);
        }
        break;
    }
  }

  private buildDefUseChains(cfg: ControlFlowGraph): Map<string, DefUseChain> {
    const chains = new Map<string, DefUseChain>();

    for (const [blockId, block] of cfg.blocks) {
      for (const stmt of block.statements) {
        this.updateDefUseChains(stmt, blockId, chains);
      }
    }

    return chains;
  }

  private updateDefUseChains(
    stmt: Statement,
    blockId: number,
    chains: Map<string, DefUseChain>,
  ): void {
    // Simplified def-use chain building
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        if (!chains.has(varDecl.name)) {
          chains.set(varDecl.name, {
            variable: varDecl.name,
            definitions: new Set(),
            uses: new Set(),
          });
        }
        chains.get(varDecl.name)!.definitions.add(blockId);
        break;

      case NodeType.AssignmentStatement:
        const assignStmt = stmt as AssignmentStatement;
        if (!chains.has(assignStmt.target)) {
          chains.set(assignStmt.target, {
            variable: assignStmt.target,
            definitions: new Set(),
            uses: new Set(),
          });
        }
        chains.get(assignStmt.target)!.definitions.add(blockId);
        break;
    }
  }

  private constantPropagation(
    block: BlockStatement,
    cfg: ControlFlowGraph,
  ): BlockStatement {
    // Simple constant propagation within basic blocks
    const constants = new Map<string, number>();

    const optimizedStatements = block.statements.map((stmt) => {
      return this.propagateConstantsInStatement(stmt, constants);
    });

    return {
      type: NodeType.BlockStatement,
      statements: optimizedStatements,
    };
  }

  private propagateConstantsInStatement(
    stmt: Statement,
    constants: Map<string, number>,
  ): Statement {
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        const optimizedInit = this.propagateConstantsInExpression(
          varDecl.init,
          constants,
        );

        // If the initializer is a constant, record it
        if (optimizedInit.type === NodeType.NumberLiteral) {
          constants.set(varDecl.name, (optimizedInit as NumberLiteral).value);
          this.stats.constantPropagation++;
        } else {
          constants.delete(varDecl.name); // Variable no longer constant
        }

        return {
          ...varDecl,
          init: optimizedInit,
        };

      case NodeType.AssignmentStatement:
        const assignStmt = stmt as AssignmentStatement;
        const optimizedValue = this.propagateConstantsInExpression(
          assignStmt.value,
          constants,
        );

        if (optimizedValue.type === NodeType.NumberLiteral) {
          constants.set(
            assignStmt.target,
            (optimizedValue as NumberLiteral).value,
          );
          this.stats.constantPropagation++;
        } else {
          constants.delete(assignStmt.target);
        }

        return {
          ...assignStmt,
          value: optimizedValue,
        };

      case NodeType.ReturnStatement:
        const returnStmt = stmt as ReturnStatement;
        return {
          ...returnStmt,
          argument: this.propagateConstantsInExpression(
            returnStmt.argument,
            constants,
          ),
        };

      case NodeType.IfStatement:
        const ifStmt = stmt as IfStatement;
        return {
          ...ifStmt,
          condition: this.propagateConstantsInExpression(
            ifStmt.condition,
            constants,
          ),
        };

      default:
        return stmt;
    }
  }

  private propagateConstantsInExpression(
    expr: Expression,
    constants: Map<string, number>,
  ): Expression {
    switch (expr.type) {
      case NodeType.Identifier:
        const identifier = expr as Identifier;
        if (constants.has(identifier.name)) {
          return {
            type: NodeType.NumberLiteral,
            value: constants.get(identifier.name)!,
          };
        }
        return expr;

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        const left = this.propagateConstantsInExpression(
          binExpr.left,
          constants,
        );
        const right = this.propagateConstantsInExpression(
          binExpr.right,
          constants,
        );

        return this.foldConstants({
          ...binExpr,
          left,
          right,
        });

      default:
        return expr;
    }
  }

  private algebraicOptimizations(block: BlockStatement): BlockStatement {
    return {
      type: NodeType.BlockStatement,
      statements: block.statements.map((stmt) =>
        this.optimizeStatementAlgebraically(stmt),
      ),
    };
  }

  private optimizeStatementAlgebraically(stmt: Statement): Statement {
    // Apply the same algebraic optimizations from the basic optimizer
    // but as a separate pass
    switch (stmt.type) {
      case NodeType.VariableDeclaration:
        const varDecl = stmt as VariableDeclaration;
        return {
          ...varDecl,
          init: this.optimizeExpressionAlgebraically(varDecl.init),
        };

      case NodeType.AssignmentStatement:
        const assignStmt = stmt as AssignmentStatement;
        return {
          ...assignStmt,
          value: this.optimizeExpressionAlgebraically(assignStmt.value),
        };

      case NodeType.ReturnStatement:
        const returnStmt = stmt as ReturnStatement;
        return {
          ...returnStmt,
          argument: this.optimizeExpressionAlgebraically(returnStmt.argument),
        };

      default:
        return stmt;
    }
  }

  private optimizeExpressionAlgebraically(expr: Expression): Expression {
    if (expr.type === NodeType.BinaryExpression) {
      const binExpr = expr as BinaryExpression;
      const left = this.optimizeExpressionAlgebraically(binExpr.left);
      const right = this.optimizeExpressionAlgebraically(binExpr.right);

      return this.applyAlgebraicRules({
        ...binExpr,
        left,
        right,
      });
    }

    return expr;
  }

  private applyAlgebraicRules(expr: BinaryExpression): Expression {
    const { left, right, operator } = expr;

    // x + 0 = x, 0 + x = x
    if (operator === "+") {
      if (
        left.type === NodeType.NumberLiteral &&
        (left as NumberLiteral).value === 0
      ) {
        this.stats.algebraicSimplification++;
        return right;
      }
      if (
        right.type === NodeType.NumberLiteral &&
        (right as NumberLiteral).value === 0
      ) {
        this.stats.algebraicSimplification++;
        return left;
      }
    }

    // x * 1 = x, 1 * x = x
    // x * 0 = 0, 0 * x = 0
    if (operator === "*") {
      if (left.type === NodeType.NumberLiteral) {
        const val = (left as NumberLiteral).value;
        if (val === 1) {
          this.stats.algebraicSimplification++;
          return right;
        }
        if (val === 0) {
          this.stats.algebraicSimplification++;
          return { type: NodeType.NumberLiteral, value: 0 };
        }
      }
      if (right.type === NodeType.NumberLiteral) {
        const val = (right as NumberLiteral).value;
        if (val === 1) {
          this.stats.algebraicSimplification++;
          return left;
        }
        if (val === 0) {
          this.stats.algebraicSimplification++;
          return { type: NodeType.NumberLiteral, value: 0 };
        }
      }
    }

    return this.foldConstants(expr);
  }

  private foldConstants(expr: BinaryExpression): Expression {
    const { left, right, operator } = expr;

    if (
      left.type === NodeType.NumberLiteral &&
      right.type === NodeType.NumberLiteral
    ) {
      const leftVal = (left as NumberLiteral).value;
      const rightVal = (right as NumberLiteral).value;
      let result: number;

      switch (operator) {
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
          if (rightVal === 0) throw new Error("Division by zero");
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
          return expr;
      }

      this.stats.constantFolding++;
      return { type: NodeType.NumberLiteral, value: result };
    }

    return expr;
  }

  private deadCodeElimination(
    block: BlockStatement,
    livenessInfo: Map<number, LivenessInfo>,
  ): BlockStatement {
    const optimizedStatements: Statement[] = [];

    for (const stmt of block.statements) {
      if (!this.isDeadStatement(stmt, livenessInfo)) {
        optimizedStatements.push(stmt);
      } else {
        this.stats.deadCodeElimination++;
      }
    }

    return {
      type: NodeType.BlockStatement,
      statements: optimizedStatements,
    };
  }

  private isDeadStatement(
    stmt: Statement,
    livenessInfo: Map<number, LivenessInfo>,
  ): boolean {
    // Simple dead code detection
    switch (stmt.type) {
      case NodeType.ExpressionStatement:
        const exprStmt = stmt as any;
        return this.isPureExpression(exprStmt.expression);

      case NodeType.VariableDeclaration:
        // Variable is dead if it's never used (would need more sophisticated analysis)
        return false;

      default:
        return false;
    }
  }

  private deadStoreElimination(
    block: BlockStatement,
    livenessInfo: Map<number, LivenessInfo>,
  ): BlockStatement {
    // Remove assignments to variables that are never used
    const optimizedStatements: Statement[] = [];

    for (const stmt of block.statements) {
      if (!this.isDeadStore(stmt, livenessInfo)) {
        optimizedStatements.push(stmt);
      } else {
        this.stats.deadStoreElimination++;
      }
    }

    return {
      type: NodeType.BlockStatement,
      statements: optimizedStatements,
    };
  }

  private isDeadStore(
    stmt: Statement,
    livenessInfo: Map<number, LivenessInfo>,
  ): boolean {
    // Simplified dead store detection
    if (stmt.type === NodeType.AssignmentStatement) {
      const assignStmt = stmt as AssignmentStatement;
      // Would need to check if the variable is live after this assignment
      // This is a placeholder for more sophisticated analysis
      return false;
    }
    return false;
  }

  private isPureExpression(expr: Expression): boolean {
    switch (expr.type) {
      case NodeType.NumberLiteral:
      case NodeType.Identifier:
        return true;

      case NodeType.BinaryExpression:
        const binExpr = expr as BinaryExpression;
        return (
          this.isPureExpression(binExpr.left) &&
          this.isPureExpression(binExpr.right)
        );

      case NodeType.FunctionCall:
        return false; // Assume function calls have side effects

      default:
        return false;
    }
  }

  private setsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
    if (set1.size !== set2.size) return false;
    for (const item of set1) {
      if (!set2.has(item)) return false;
    }
    return true;
  }
}
