	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_Calculate					 ; -- Begin function Calculate
	.p2align	2
_Calculate:						 ; @Calculate
	sub	sp, sp, #96
	stp	x29, x30, [sp, #80]
	add	x29, sp, #80
	str	w0, [sp, #16]
	ldr	w0, [sp, #16]
	str	w0, [sp, #20]
	ldr	w0, [sp, #20]
	str	w0, [sp, #24]
	ldr	w0, [sp, #24]
	ldp	x29, x30, [sp, #80]
	add	sp, sp, #96
	ret
							 ; -- End function

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #48
	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	w0, #42				; =0x2a
	bl	_Calculate
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
	mov	w0, #0				; =0x0
	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str.0:
	.asciz	"%d\n"
.subsections_via_symbols