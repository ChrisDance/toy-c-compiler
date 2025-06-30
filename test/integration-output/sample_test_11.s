	.section	__TEXT,__text,regular,pure_instructions
	.build_version macos, 15, 0	sdk_version 15, 4

	.globl	_main					 ; -- Begin function main
	.p2align	2
_main:						 ; @main
	sub	sp, sp, #48
	stp	x29, x30, [sp, #32]			 ; 16-byte Folded Spill
	add	x29, sp, #32
	mov	w0, #5				; =0x5
	mov	w8, w0
	mov	w0, #10				; =0xa
	mov	w9, w0
	cmp	w8, w9
	cset	w0, gt
	cmp	w0, #0
	beq	L1_endif
	mov	w0, #999				; =0x3e7
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.0@PAGE
add x0, x0, l_.str.0@PAGEOFF
bl _printf
L1_endif:
	mov	w0, #0				; =0x0
	mov	w9, w0
	mov	w0, #0				; =0x0
	mov	w8, w0
	cmp	w9, w8
	cset	w0, eq
	cmp	w0, #0
	beq	L2_endif
	mov	w0, #42				; =0x2a
mov x9, sp
mov x8, x0
str x8, [x9]
adrp x0, l_.str.1@PAGE
add x0, x0, l_.str.1@PAGEOFF
bl _printf
L2_endif:
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
l_.str.1:
	.asciz	"%d\n"
.subsections_via_symbols