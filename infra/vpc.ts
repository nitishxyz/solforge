export const vpc =
	$app.stage === "prod" || $app.stage === "dev"
		? sst.aws.Vpc.get("ForgeVpc", "vpc-0ae9a9698220d6275")
		: sst.aws.Vpc.get("ForgeVpc", "vpc-0ae9a9698220d6275");
