import fs from 'node:fs/promises';

import type { AstroIntegration, ContentEntryType, HookParameters } from 'astro';
// This rendered seems to be private and is not explicitly exported.
// @ts-ignore
import astroJSXRenderer from 'astro/jsx/renderer.js';

import { unified, type PluggableList } from 'unified';
import { VFile } from 'vfile';
import uniorg from 'uniorg-parse';
import orgPlugin, { type OrgPluginOptions } from 'rollup-plugin-orgx';
import { extractKeywords } from 'uniorg-extract-keywords';
import { uniorgSlug } from 'uniorg-slug';

declare module 'vfile' {
  interface DataMap {
    astro: {
      frontmatter: Record<string, unknown>;
    };
  }
}

interface ExtendedOrgPluginOptions extends OrgPluginOptions {
  uniorgPlugins?: any[];
  rehypePlugins?: any[];
}

// export type Options = ExtendedOrgPluginOptions;

type SetupHookParams = HookParameters<'astro:config:setup'> & {
  // `addPageExtension` and `contentEntryType` are not a public APIs
  // Add type defs here
  addPageExtension: (extension: string) => void;
  addContentEntryType: (contentEntryType: ContentEntryType) => void;
};

export default function org(options: ExtendedOrgPluginOptions = {}): AstroIntegration {
  const uniorgPlugins: PluggableList = [
    initFrontmatter,
    [extractKeywords, { name: 'keywords' }],
    keywordsToFrontmatter,
    uniorgSlug,
	...(options.uniorgPlugins ?? []),
  ];

  return {
    name: 'astro-org',
    hooks: {
      'astro:config:setup': async (params) => {
        const {
          updateConfig,
          addRenderer,
          addContentEntryType,
          addPageExtension,
        } = params as SetupHookParams;

        addRenderer(astroJSXRenderer);
        addPageExtension('.org');
        addContentEntryType({
          extensions: ['.org'],
          async getEntryInfo({ fileUrl, contents }) {
            const processor = unified().use(uniorg).use(uniorgPlugins);

            const f = new VFile({ path: fileUrl, value: contents });
            await processor.run(processor.parse(f), f);

            const frontmatter = f.data.astro!.frontmatter;
            return {
              data: frontmatter,
              body: contents,
              // Astro typing requires slug to be a string, however
              // I'm pretty sure that mdx integration returns
              // undefined if slug is not set in frontmatter.
              slug: frontmatter.slug as any,
              rawData: contents,
            };
          },
          contentModuleTypes: await fs.readFile(
            new URL('./content-module-types.d.ts', import.meta.url),
            'utf-8'
          ),
          handlePropagation: true,
        });
        updateConfig({
          vite: {
            plugins: [
              {
                enforce: 'pre',
                configResolved(resolved: any) {
                  // HACK: move ourselves before Astro's JSX plugin to transform things in the right order
                  const jsxPluginIndex = resolved.plugins.findIndex(
                    (p: any) => p.name === 'astro:jsx'
                  );
                  if (jsxPluginIndex !== -1) {
                    const myPluginIndex = resolved.plugins.findIndex(
                      (p: any) => p.name === 'rollup-plugin-orgx'
                    );
                    if (myPluginIndex !== -1) {
                      const myPlugin = resolved.plugins[myPluginIndex];
                      // @ts-ignore-error ignore readonly annotation
                      resolved.plugins.splice(myPluginIndex, 1);
                      // @ts-ignore-error ignore readonly annotation
                      resolved.plugins.splice(jsxPluginIndex, 0, myPlugin);
                    }
                  }
                },
                ...orgPlugin({
                  ...options,
                  uniorgPlugins,
                  rehypePlugins: [
                    ...(options.rehypePlugins ?? []),
                    // rehypeExportFrontmatter,
                  ],
                  development: false,
                  jsxImportSource: 'astro',
                } as ExtendedOrgPluginOptions),
              },
              {
                name: 'astro-org/postprocess',
                transform: (code: string, id: string) => {
                  if (!id.endsWith('.org')) {
                    return;
                  }

                  const fileId = id.split('?')[0];

                  code += `\nexport { Content };`;
                  code += `\nexport const file = ${JSON.stringify(fileId)};`;

                  return code;
                },
              },
            ],
          },
        });
      },
    },
  };
}

function initFrontmatter() {
  return transformer;

  function transformer(_tree: any, file: VFile) {
    if (!file.data.astro) {
      file.data.astro = { frontmatter: {} };
    }
  }
}

function keywordsToFrontmatter() {
  return transformer;

  function transformer(_tree: any, file: any) {
    file.data.astro.frontmatter = {
      ...file.data.astro.frontmatter,
      ...file.data.keywords,
    };
  }
}

