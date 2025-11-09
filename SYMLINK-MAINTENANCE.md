# Symlink Maintenance Guide

## ✅ RESOLVED (Nov 9, 2025)

**The symlink issue has been permanently resolved** by adding the development plugin to Homebridge's `package.json`:

```json
"homebridge-shelly-ds9-dev": "file:../../../home/pi/dev/homebridge-shelly-ds9"
```

The symlink now **automatically persists** through all npm operations, plugin updates, and Homebridge UI changes. No manual intervention is required anymore.

The information below is kept for historical reference and troubleshooting.

---

## The Problem (Historical)

When developing the `homebridge-shelly-ds9` plugin, we use a symlink from `/var/lib/homebridge/node_modules/homebridge-shelly-ds9-dev` to `/home/pi/dev/homebridge-shelly-ds9` so Homebridge loads our development version.

**The symlink used to get deleted when:**
- Installing/updating/removing plugins via Homebridge UI
- Running `npm install`, `npm update`, or `npm prune` in `/var/lib/homebridge/`
- Homebridge automatic plugin updates

This happened because npm cleaned up symlinks that weren't declared in `package.json`.

## Quick Fix

Run the restoration script:
```bash
/home/pi/restore-shelly-symlink.sh
```

This script will:
1. Build the development plugin
2. Recreate the symlink
3. Restart Homebridge

## Manual Fix

If you prefer to do it manually:

```bash
# 1. Build the plugin
cd /home/pi/dev/homebridge-shelly-ds9
npm run build

# 2. Create symlink
cd /var/lib/homebridge/node_modules
sudo ln -sf /home/pi/dev/homebridge-shelly-ds9 homebridge-shelly-ds9

# 3. Restart Homebridge
sudo systemctl restart homebridge
```

## Prevention Strategies

### Option 1: Check Before Plugin Operations (Recommended)
Before installing/updating plugins via Homebridge UI, be aware you'll need to restore the symlink afterward.

**Best practice:**
1. Make plugin changes via Homebridge UI
2. Run `/home/pi/restore-shelly-symlink.sh`
3. Verify in logs: `tail -f /var/lib/homebridge/homebridge.log`

### Option 2: Add to package.json (Persistent)
To make the symlink survive npm operations, add it to `package.json`:

```bash
cd /var/lib/homebridge
npm install --save /home/pi/dev/homebridge-shelly-ds9
```

**Pros:**
- Symlink persists through npm operations
- Package.json tracks the dependency

**Cons:**
- May cause confusion (looks like installed package)
- Homebridge UI might show it as an installed plugin
- Could interfere with UI plugin management

### Option 3: npm link (Alternative Method)
Use npm's built-in linking mechanism:

```bash
# In the development plugin directory
cd /home/pi/dev/homebridge-shelly-ds9
sudo npm link

# In Homebridge directory
cd /var/lib/homebridge
sudo npm link homebridge-shelly-ds9
```

**Pros:**
- Official npm feature for development
- Creates proper registry entry

**Cons:**
- Still can be removed by npm operations
- More complex to set up

## Verification

Check if symlink exists:
```bash
ls -la /var/lib/homebridge/node_modules/ | grep homebridge-shelly
```

Expected output should include:
```
lrwxrwxrwx  1 root root     34 Nov  9 00:01 homebridge-shelly-ds9 -> /home/pi/dev/homebridge-shelly-ds9
```

Check plugin loaded in Homebridge:
```bash
tail -50 /var/lib/homebridge/homebridge.log | grep shelly-ds9
```

Should see:
```
Loaded plugin: homebridge-shelly-ds9-dev@1.5.8
```

## When to Check

Always verify the symlink after:
- ✓ Installing any Homebridge plugin via UI
- ✓ Updating any Homebridge plugin via UI
- ✓ Removing any Homebridge plugin via UI
- ✓ Homebridge automatic updates
- ✓ Running npm commands in `/var/lib/homebridge/`

## Automation Ideas (Future)

Consider creating a systemd path unit to monitor and auto-restore the symlink, or a cron job to verify and restore it periodically.
