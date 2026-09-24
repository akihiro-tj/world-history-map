{
  description = "世界史地図の開発環境";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          # pnpm は package.json の packageManager に書いた版へ自動で切り替わる
          packages = [
            pkgs.nodejs_24
            pkgs.pnpm
          ];
        };
      });
    };
}
