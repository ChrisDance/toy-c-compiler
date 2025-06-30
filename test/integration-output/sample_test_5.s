	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_func					 ; -- Begin function func
	.p2align	2
_func:						 ; @func
	sub	sp, sp, #160
	stp	x29, x30, [sp, #144]
	add	x29, sp, #144
	str	w0, [sp, #16]
	str	w1, [sp, #20]
	ldr	w0, [sp, #16]
	mov	w8, w0
	ldr	w0, [sp, #20]
	mov	w9, w0
	add	w0, w8, w9
	b	L0_function_end
L0_function_end:
	ldp	x29, x30, [sp, #144]
	add	sp, sp, #160
	ret
							 ; -- End function

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #48
	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	w0, #5				; =0x5
	stur	w0, [x29, #-4]
	mov	w0, #5				; =0x5
	stur	w0, [x29, #0]
	ldur	w0, [x29, #-4]
	ldur	w1, [x29, #0]
	bl	_func
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
	mov	w0, #0				; =0x0
	b	L1_function_end
L1_function_end:
	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str.0:
	.asciz	"%d\n"
.subsections_via_symbols