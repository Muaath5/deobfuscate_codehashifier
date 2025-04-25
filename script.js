/**
 * Deobfuscator for C++ code with recursive #define macros
 */
function deobfuscate(code) {
    // Extract all #define statements
    const defineRegex = /#define\s+(\S+)\s+(.+);?$/gm;
    const defines = {};
    let match;
    
    while ((match = defineRegex.exec(code)) !== null) {
      defines[match[1]] = match[2].trim();
    }
    
    // Function to recursively resolve macros
    function resolveMacro(macro, visited = new Set()) {
      if (!defines[macro]) return macro;
      if (visited.has(macro)) {
        console.warn(`Circular reference detected for macro: ${macro}`);
        return `[CIRCULAR: ${macro}]`;
      }
      
      visited.add(macro);
      
      // Replace each word in the macro definition with its resolved value
      let resolved = defines[macro];
      const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
      let wordMatch;
      
      while ((wordMatch = wordRegex.exec(resolved)) !== null) {
        const word = wordMatch[1];
        if (defines[word]) {
          const resolvedWord = resolveMacro(word, new Set(visited));
          resolved = resolved.replace(new RegExp(`\\b${word}\\b`, 'g'), resolvedWord);
        }
      }
      
      return resolved;
    }
    
    // Process the code after define statements
    const codeWithoutDefines = code.split(/\n/).filter(line => !line.trim().startsWith('#define')).join('\n');
    
    // Replace all macros with their resolved values
    let deobfuscated = codeWithoutDefines;
    for (const macro in defines) {
      const resolvedValue = resolveMacro(macro);
      deobfuscated = deobfuscated.replace(new RegExp(`\\b${macro}\\b`, 'g'), resolvedValue);
    }
    
    return deobfuscated;
}
  
/**
 * Complete deobfuscation including reconstruction of the original code
 */
function completeDeobfuscation(obfuscatedCode) {
    // First pass: collect all #define statements
    const defineRegex = /#define\s+(\S+)\s+(.+);?$/gm;
    const defines = {};
    let match;
    
    while ((match = defineRegex.exec(obfuscatedCode)) !== null) {
        defines[match[1]] = match[2].trim();
    }
    
    // Second pass: extract the actual code (after the defines)
    const codeLines = obfuscatedCode.split('\n').filter(line => !line.trim().startsWith('#define'));
    
    // Build dependency graph for resolving in correct order
    const dependencies = {};
    const resolved = {};
    
    for (const macro in defines) {
        dependencies[macro] = [];
        const value = defines[macro];
        const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        let wordMatch;
        
        while ((wordMatch = wordRegex.exec(value)) !== null) {
            const word = wordMatch[1];
            if (defines[word]) {
                dependencies[macro].push(word);
            }
        }
    }
    
    // Recursive resolution function with cycle detection
    function resolveValue(macro, visited = new Set()) {
        if (resolved[macro]) return resolved[macro];
        if (visited.has(macro)) {
            console.warn(`Circular reference detected for macro: ${macro}`);
            return `[CIRCULAR: ${macro}]`;
        }
    
        visited.add(macro);
        let value = defines[macro];
        
        if (!value) return macro; // Not a macro
        
        // Replace all macros in this value
        const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        let wordMatch;
        let result = value;
        
        while ((wordMatch = wordRegex.exec(value)) !== null) {
            const word = wordMatch[1];
            if (defines[word]) {
            const resolvedWord = resolveValue(word, new Set(visited));
            result = result.replace(new RegExp(`\\b${word}\\b`, 'g'), resolvedWord);
            }
        }
        
        resolved[macro] = result;
        return result;
    }
    
    // Process the code
    let deobfuscatedCode = '';
    for (const line of codeLines) {
        let processedLine = line;
        const wordRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        let wordMatch;
        let matches = [];
        
        // Collect all matches first to avoid regex state issues
        while ((wordMatch = wordRegex.exec(line)) !== null) {
            matches.push(wordMatch[1]);
        }
        
        // Then replace them
        for (const word of matches) {
            if (defines[word]) {
                const resolvedValue = resolveValue(word);
                processedLine = processedLine.replace(new RegExp(`\\b${word}\\b`, 'g'), resolvedValue);
            }
        }
        
        deobfuscatedCode += processedLine + '\n';
    }
    
    return deobfuscatedCode;
}

/**
 * Create a pretty version of the original code with all macros resolved
 */
function prettyPrint(deobfuscatedCode, intentSpaces = 4) {
    // Basic formatting for readability
    let pretty = deobfuscatedCode
    .replace(/\s+/g, ' ')     // Normalize whitespace
    .replace(/;/g, ';\n')     // Line break after semicolons
    .replace(/{/g, '{\n')     // Line break after opening braces
    .replace(/}/g, '}\n')     // Line break after closing braces
    .replace(/^(#.*)$/gm, '$1\n') 
    .replace(/\) {/g, ') {')  // Space before opening brace
    .trim();
    
    // Indent the code
    const lines = pretty.split('\n');
    let indentLevel = 0;
    let result = [];
    
    for (const line of lines) {
        if (line.includes('}')) indentLevel = Math.max(0, indentLevel - 1);
        
        if (line.trim().length > 0) {
            result.push(' '.repeat(intentSpaces*indentLevel) + line.trim());
        }
        
        if (line.includes('{')) indentLevel++;
    }
    
    return result.join('\n');
}