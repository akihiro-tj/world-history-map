{
  description = "Development environment for world-history-map";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
  };

  outputs = { nixpkgs, ... }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
      # Lag spec-kit one week behind upstream as a cooldown; bump only to tags released >= 7 days ago.
      speckitVersion = "v0.8.17";
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = nixpkgs.legacyPackages.${system};
          specify = pkgs.writeShellScriptBin "specify" ''
            exec ${pkgs.uv}/bin/uv tool run \
              --from "git+https://github.com/github/spec-kit.git@${speckitVersion}" \
              specify "$@"
          '';
        in
        {
          default = pkgs.mkShell {
            packages = (with pkgs; [
              git
              nodejs_24
              tippecanoe
              uv
            ]) ++ [ specify ];
          };
        });
    };
}
