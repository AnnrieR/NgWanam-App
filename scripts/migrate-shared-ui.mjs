// One-time, syntax-aware migration of native presentation controls to shadcn.
// Hidden inputs remain HTML transport fields; file inputs remain hidden OS pickers.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const mappings = {
  form: ['Form', '@/components/ui/form'],
  input: ['Input', '@/components/ui/form-input'],
  select: ['FormSelect', '@/components/ui/form-select'],
  option: ['SelectOption', '@/components/ui/form-select'],
  textarea: ['Textarea', '@/components/ui/textarea'],
  button: ['Button', '@/components/ui/button'],
  label: ['Label', '@/components/ui/label'],
  details: ['Disclosure', '@/components/ui/disclosure'],
  summary: ['DisclosureSummary', '@/components/ui/disclosure'],
  table: ['Table', '@/components/ui/table'],
  thead: ['TableHeader', '@/components/ui/table'],
  tbody: ['TableBody', '@/components/ui/table'],
  tr: ['TableRow', '@/components/ui/table'],
  th: ['TableHead', '@/components/ui/table'],
  td: ['TableCell', '@/components/ui/table'],
};
let changed = 0;
function visitDirectory(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (filename !== path.join(process.cwd(), 'src/components/ui')) visitDirectory(filename); continue; }
    if (!filename.endsWith('.tsx')) continue;
    const original = fs.readFileSync(filename, 'utf8');
    const source = ts.createSourceFile(filename, original, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const edits = [], needed = new Map(), imported = new Set();
    for (const statement of source.statements) if (ts.isImportDeclaration(statement)) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) imported.add(binding.name.text);
    }
    function visit(node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxClosingElement(node)) {
        const tag = node.tagName.getText(source), replacement = mappings[tag];
        if (replacement) {
          let skip = false;
          if (tag === 'input') {
            const attributes = node.attributes?.properties ?? [];
            const type = attributes.find(attribute => ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'type');
            const value = type?.initializer && ts.isStringLiteral(type.initializer) ? type.initializer.text : null;
            skip = value === 'hidden' || value === 'radio';
          }
          if (!skip) {
            edits.push({ start: node.tagName.getStart(source), end: node.tagName.end, text: replacement[0] });
            needed.set(replacement[0], replacement[1]);
            if (tag === 'button' && !ts.isJsxClosingElement(node)) edits.push({ start: node.tagName.end, end: node.tagName.end, text: ' variant="ghost"' });
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    let text = original;
    for (const edit of edits.sort((a,b) => b.start - a.start || b.end - a.end)) text = text.slice(0,edit.start) + edit.text + text.slice(edit.end);
    text = text.replace(/from (["'])@\/components\/ui\/input\1/g, 'from "@/components/ui/form-input"');
    const imports = new Map();
    for (const [name, module] of needed) if (!imported.has(name)) { const names = imports.get(module) ?? []; names.push(name); imports.set(module, names); }
    if (imports.size) {
      const declarations = [...imports].map(([module,names]) => `import { ${names.join(', ')} } from "${module}";`).join('\n') + '\n';
      const directive = text.match(/^(["']use client["'];?\r?\n)/);
      const at = directive ? directive[0].length : 0;
      text = text.slice(0,at) + '\n' + declarations + text.slice(at);
    }
    text = text.replace(/5 \* 1024 \* 1024/g, '1024 * 1024').replace(/file\.size > 1024 \* 1024/g,'file.size >= 1024 * 1024');
    text = text.replace(/maximum 5 MB|max 5 MB|up to 5 MB|under 5 MB/g, 'smaller than 1 MB');
    text = text.replace(/\.reportValidity\(\)/g, '.checkValidity()');
    if (text !== original) { fs.writeFileSync(filename, text); changed++; console.log(path.relative(process.cwd(), filename)); }
  }
}
visitDirectory(path.join(process.cwd(),'src'));
console.log(`Migrated ${changed} files.`);
