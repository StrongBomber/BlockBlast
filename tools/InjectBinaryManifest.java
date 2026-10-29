import java.io.File;
import com.reandroid.arsc.chunk.xml.AndroidManifestBlock;
import com.reandroid.arsc.chunk.xml.ResXmlElement;

/** Experimental provider injection without recompiling the game's resources. */
public class InjectBinaryManifest {
    public static void main(String[] args) throws Exception {
        if (args.length != 2) throw new IllegalArgumentException("input.xml output.xml");
        AndroidManifestBlock manifest = AndroidManifestBlock.load(new File(args[0]));
        if (!"com.block.juggle".equals(manifest.getPackageName()))
            throw new IllegalArgumentException("Unexpected package");
        String providerName = "ai.arena.blockblast.menu.MenuBootstrapProvider";
        ResXmlElement app = manifest.getApplicationElement();
        if (app == null) throw new IllegalStateException("No application element");
        ResXmlElement provider = app.newElement("provider");
        provider.getOrCreateAndroidAttribute("name", 0x01010003).setValueAsString(providerName);
        provider.getOrCreateAndroidAttribute("authorities", 0x01010018)
                .setValueAsString("com.block.juggle.arena.menu.bootstrap");
        provider.getOrCreateAndroidAttribute("exported", 0x01010010).setValueAsBoolean(false);
        manifest.refresh();
        manifest.writeBytes(new File(args[1]));
    }
}
