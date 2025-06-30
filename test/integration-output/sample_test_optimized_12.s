	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_a					 ; -- Begin function a
	.p2align	2
_a:						 ; @a
	sub	sp, sp, #112
	stp	x29, x30, [sp, #96]
	add	x29, sp, #96
	stur	w0, [x29, #-8]
	mov	w0, #1				; =0x1
	mov	w8, w0
	ldur	w0, [x29, #-8]
	mov	w9, w0
	add	w0, w8, w9
	ldp	x29, x30, [sp, #96]
	add	sp, sp, #112
	ret
							 ; -- End function

	.globl	_b					 ; -- Begin function b
	.p2align	2
_b:						 ; @b
	sub	sp, sp, #112
	stp	x29, x30, [sp, #96]
	add	x29, sp, #96
	stur	w0, [x29, #-8]
	mov	w0, #1				; =0x1
	mov	w8, w0
	ldur	w0, [x29, #-8]
	mov	w9, w0
	add	w0, w8, w9
	ldp	x29, x30, [sp, #96]
	add	sp, sp, #112
	ret
							 ; -- End function

	.globl	_c					 ; -- Begin function c
	.p2align	2
_c:						 ; @c
	sub	sp, sp, #112
	stp	x29, x30, [sp, #96]
	add	x29, sp, #96
	stur	w0, [x29, #-8]
	mov	w0, #1				; =0x1
	mov	w8, w0
	ldur	w0, [x29, #-8]
	mov	w9, w0
	add	w0, w8, w9
	ldp	x29, x30, [sp, #96]
	add	sp, sp, #112
	ret
							 ; -- End function

	.globl	_d					 ; -- Begin function d
	.p2align	2
_d:						 ; @d
	sub	sp, sp, #112
	stp	x29, x30, [sp, #96]
	add	x29, sp, #96
	stur	w0, [x29, #-8]
	mov	w0, #1				; =0x1
	mov	w8, w0
	ldur	w0, [x29, #-8]
	mov	w9, w0
	add	w0, w8, w9
	ldp	x29, x30, [sp, #96]
	add	sp, sp, #112
	ret
							 ; -- End function

	.globl	_e					 ; -- Begin function e
	.p2align	2
_e:						 ; @e
	sub	sp, sp, #112
	stp	x29, x30, [sp, #96]
	add	x29, sp, #96
	stur	w0, [x29, #-8]
	mov	w0, #1				; =0x1
	mov	w8, w0
	ldur	w0, [x29, #-8]
	mov	w9, w0
	add	w0, w8, w9
	ldp	x29, x30, [sp, #96]
	add	sp, sp, #112
	ret
							 ; -- End function

	.globl	_f					 ; -- Begin function f
	.p2align	2
_f:						 ; @f
	sub	sp, sp, #112
	stp	x29, x30, [sp, #96]
	add	x29, sp, #96
	stur	w0, [x29, #-8]
	mov	w0, #1				; =0x1
	mov	w8, w0
	ldur	w0, [x29, #-8]
	mov	w9, w0
	add	w0, w8, w9
	ldp	x29, x30, [sp, #96]
	add	sp, sp, #112
	ret
							 ; -- End function

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #96
	stp	x29, x30, [sp, #80]
	add	x29, sp, #80
	mov	w0, #1				; =0x1
	bl	_f
	bl	_e
	bl	_d
	bl	_c
	bl	_b
	bl	_a
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
	mov	w0, #0				; =0x0
	ldp	x29, x30, [sp, #80]
	add	sp, sp, #96
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str.0:
	.asciz	"%d\n"
.subsections_via_symbols