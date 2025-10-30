# Troubleshooting `Unexpected token` errors in `src/IdeaBoardApp.jsx`

If Vite reports an `Unexpected token` at the top of `src/IdeaBoardApp.jsx`, the problem is usually one of the following:

1. **Missing React import.** Ensure the file begins with:

   ```js
   import React, { useEffect, useMemo, useState } from "react";
   ```

   Without that line, JSX and React hooks fail to compile in environments that still require an explicit `React` reference.

2. **Unicode ellipsis (`…`) pasted into the file.** Rich text editors often replace three ASCII dots with the single character `…` (U+2026), which the bundler cannot parse.

Run the helper script below to find and replace any ellipsis characters:

```bash
npm run check:unicode
```

You can pass a path to narrow the scan:

```bash
node scripts/find-unicode-ellipsis.mjs src/components
```

Replace each `…` with the intended code (typically `...`).
