vim.lsp.config(
	"tailwindcss-language-server",
	(function()
		local opts = {}
		opts.capabilities = require("blink.cmp").get_lsp_capabilities()
		return opts
	end)()
)

vim.lsp.config(
	"alloy_ls",
	(function()
		return {
			cmd = { "alloy6", "lsp" },
			filetypes = { "alloy" },
			root_markers = { ".git" },
		}
	end)()
)

vim.lsp.enable({
	"tailwindcss-language-server",
	"alloy_ls",
})
