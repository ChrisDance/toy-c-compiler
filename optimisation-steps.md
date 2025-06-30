# Iterative Compiler Optimization Passes

## Original Code
```cpp
int main()
{
  int x = 3;
  int y = x + 7;
  int z = 2 * y;
  if(x < y) {
    z = x / 2 + y / 3;
  } else {
    z = x * y + y;
  }
}
```

## Pass 1: Dead Code Elimination
**Analysis**: `z = 2 * y` is dead code because z is reassigned in both branches of the if statement without being used first.
```cpp
int main()
{
  int x = 3;
  int y = x + 7;
  if(x < y) {
    z = x / 2 + y / 3;
  } else {
    z = x * y + y;
  }
}
```

## Pass 1: Constant Propagation
**Analysis**: x = 3 is constant, so replace x with 3 throughout the function.
```cpp
int main()
{
  int x = 3;
  int y = 3 + 7;
  if(3 < y) {
    z = 3 / 2 + y / 3;
  } else {
    z = 3 * y + y;
  }
}
```

## Pass 1: Constant Folding
**Analysis**: Evaluate simple constant expressions (only those involving literals).
- `3 + 7` → `10`
- Leave `3 < y` as-is since y is still a variable reference

```cpp
int main()
{
  int x = 3;
  int y = 10;
  if(3 < y) {
    z = 3 / 2 + y / 3;
  } else {
    z = 3 * y + y;
  }
}
```

## Pass 2: Dead Code Elimination
**Analysis**: No dead code detected yet - all variables are still potentially used.
```cpp
int main()
{
  int x = 3;
  int y = 10;
  if(3 < y) {
    z = 3 / 2 + y / 3;
  } else {
    z = 3 * y + y;
  }
}
```

## Pass 2: Constant Propagation
**Analysis**: Both x = 3 and y = 10 are constants, so replace them throughout.
```cpp
int main()
{
  int x = 3;
  int y = 10;
  if(3 < 10) {
    z = 3 / 2 + 10 / 3;
  } else {
    z = 3 * 10 + 10;
  }
}
```

## Pass 2: Constant Folding
**Analysis**: Now we can evaluate all the constant expressions.
- `3 < 10` → `true`
- `3 / 2` → `1` (integer division)
- `10 / 3` → `3` (integer division)
- `1 + 3` → `4`
- `3 * 10 + 10` → `40` (though this branch is unreachable)

```cpp
int main()
{
  int x = 3;
  int y = 10;
  if(true) {
    z = 4;
  } else {
    z = 40;
  }
}
```

## Pass 3: Dead Code Elimination
**Analysis**: The else branch is unreachable due to constant condition. Also, x and y are no longer referenced after constant propagation.
```cpp
int main()
{
  z = 4;
}
```

## Pass 3: Constant Propagation & Constant Folding
**Analysis**: No further opportunities.
```cpp
int main()
{
  z = 4;
}
```

## Final Pass: Dead Code Elimination
**Analysis**: If variables x, y, z are not used after assignment (no return statement or side effects), they could be eliminated entirely.
```cpp
int main()
{
  // Empty function body - all computations eliminated
}
```

## Summary
The optimization process went through **4 major iterations** before reaching a fixed point:

1. **Pass 1**: Propagated x=3, folded constants, eliminated unreachable else branch
2. **Pass 2**: Propagated y=10, folded remaining arithmetic operations
3. **Pass 3**: Eliminated dead assignment z=20
4. **Final**: Could eliminate all variables if they have no observable effects

The key insight is that the conditional `if(x < y)` with x=3 and y=10 always evaluates to true, making the entire else branch dead code and enabling aggressive optimization of the remaining linear code sequence.
