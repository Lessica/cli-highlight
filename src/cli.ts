import * as fs from 'mz/fs'
import * as path from 'path'
import * as tty from 'tty'
import yargs from 'yargs'
import { highlight, HighlightOptions, supportsLanguage } from '.'
import { parse } from './theme'

yargs
    .usage(
        ['', 'Usage: highlight [options] [file]', '', 'Outputs a file or STDIN input with syntax highlighting'].join(
            '\n'
        )
    )
    .option('theme', {
        alias: 't',
        nargs: 1,
        description: 'Use a theme defined in a JSON file',
    })
    .option('language', {
        alias: 'l',
        nargs: 1,
        description: 'Set the langugage explicitely\nIf omitted will try to auto-detect',
    })
    .option('terminator', {
        alias: 'e',
        default: '\0',
        nargs: 1,
        description: 'Set the terminator character',
    })
    .version()
    .help('help')
    .alias('help', 'h')
    .alias('version', 'v')

interface Arguments extends yargs.Arguments {
    theme?: string
    language?: string
    terminator?: string
}

const argv: Arguments = yargs.argv
const filePath = argv._[0]
const highlightTheme = argv.theme ? fs.readFileSync(argv.theme, 'utf8') : undefined
const options: HighlightOptions = {
    ignoreIllegals: true,
    theme: (highlightTheme && parse(highlightTheme)) || undefined,
}
if (filePath) {
    const fileExtension = path.extname(filePath).slice(1)
    if (fileExtension && supportsLanguage(fileExtension)) {
        options.language = fileExtension
    }
}
options.language = argv.language

let printCode = ((codeString: string) => {
    process.stdout.write(highlight(codeString, options), (error: any) => (error ? console.error(error) : null))
});

if (!filePath && !(process.stdin as tty.ReadStream).isTTY) {
    process.stdin.setEncoding('utf8')

    let code = ''
    process.stdin.on('readable', () => {
        const chunk = process.stdin.read()
        if (chunk !== null) {
            code += chunk
        }
        if (argv.terminator) {
            const terminator = argv.terminator
            if (code.endsWith(terminator)) {
                printCode(code)
                code = ''
            }
        }
    })

    new Promise<string>(resolve => {
        process.stdin.on('end', () => {
            const chunk = process.stdin.read()
            if (chunk !== null) {
                code += chunk
            }
            resolve(code)
        })
    })
    .then(codeString => {
        printCode(codeString)
        process.exit(0)
    })
    .catch(error => {
        console.error(error)
        process.exit(1)
    })
}
else if (filePath) {
    printCode(fs.readFileSync(filePath, 'utf-8'))
    process.exit(0)
}
else {
    yargs.showHelp()
    process.exit(1)
}