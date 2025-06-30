	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #48
	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	w8, #5				; =0x5
	stur	w8, [x29, #-4]
	mov	w0, #1				; =0x1
	mov	w8, w0
	mov	w0, #1				; =0x1
	mov	w9, w0
	cmp	w8, w9
	cset	w0, eq
	cmp	w0, #0
	beq	L2_else
	ldur	w0, [x29, #-4]
	mov	w8, w0
	mov	w0, #100				; =0x64
	mov	w9, w0
	add	w0, w8, w9
	stur	w0, [x29, #-4]
	b	L1_endif
L2_else:
	ldur	w0, [x29, #-4]
	mov	w8, w0
	mov	w0, #200				; =0xc8
	mov	w9, w0
	add	w0, w8, w9
	stur	w0, [x29, #-4]
L1_endif:
	ldur	w0, [x29, #-4]
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
	mov	w0, #0				; =0x0
	b	L0_function_end
L0_function_end:
	ldp	x29, x30, [sp, #32]			 ; 16-byte Folded Reload
	add	sp, sp, #48
	ret
							 ; -- End function

	.section	__TEXT,__cstring,cstring_literals
l_.str.0:
	.asciz	"%d\n"
.subsections_via_symbols