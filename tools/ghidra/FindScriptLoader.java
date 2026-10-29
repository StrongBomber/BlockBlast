// Find code references to Cocos's script-decryption error messages.
// @category Analysis
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Data;
import ghidra.program.model.listing.DataIterator;
import ghidra.program.model.listing.Function;
import ghidra.program.model.symbol.Reference;
import java.io.PrintWriter;
import java.util.HashSet;
import java.util.Set;

public class FindScriptLoader extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        try (PrintWriter out = new PrintWriter(args[0], "UTF-8")) {
            DecompInterface decompiler = new DecompInterface();
            if (!decompiler.openProgram(currentProgram)) throw new Exception("Decompiler failed to open binary");
            Set<Address> reported = new HashSet<>();
            DataIterator it = currentProgram.getListing().getDefinedData(true);
            while (it.hasNext() && !monitor.isCancelled()) {
                Data data = it.next();
                Object value = data.getValue();
                if (!(value instanceof String)) continue;
                String text = (String) value;
                if (!text.contains("Can't decrypt code") && !text.contains("ScriptEngine::runScript script")) continue;
                out.println("\nSTRING " + data.getAddress() + " " + text);
                Reference[] refs = currentProgram.getReferenceManager().getReferencesTo(data.getAddress());
                out.println("references: " + refs.length);
                for (Reference ref : refs) {
                    Function function = getFunctionContaining(ref.getFromAddress());
                    out.println("xref " + ref.getFromAddress() + " function " + (function == null ? "none" : function.getEntryPoint()));
                    if (function == null || !reported.add(function.getEntryPoint())) continue;
                    DecompileResults result = decompiler.decompileFunction(function, 120, monitor);
                    if (result.decompileCompleted()) out.println(result.getDecompiledFunction().getC());
                    else out.println("Decompile error: " + result.getErrorMessage());
                }
            }
            decompiler.dispose();
        }
    }
}
