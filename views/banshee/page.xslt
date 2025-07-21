<?xml version="1.0" ?>
<!--
//
//  Copyright (c) by Hugo Leisink <hugo@leisink.net>
//  This file is part of the Banshee PHP framework
//  https://www.banshee-php.org/
//
//  Licensed under The MIT License
//
//-->
<xsl:stylesheet version="1.1" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
<xsl:import href="main.xslt" />

<!--
//
//  Form template
//
//-->
<xsl:template match="form">
<form action="{url}" method="post">
<xsl:value-of disable-output-escaping="yes" select="content" />
<div class="btn-group">
<input type="submit" name="submit_button" value="{submit}" class="btn btn-default" />
<xsl:if test="../back">
<a href="/{../back}" class="btn btn-default">Back</a>
</xsl:if>
</div>
</form>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="page">
<h1><xsl:value-of select="title" /></h1>
<xsl:call-template name="show_messages" />
<xsl:apply-templates select="form" />
<xsl:if test="not(form)">
<xsl:value-of disable-output-escaping="yes" select="content" />
<xsl:if test="back">
<div class="btn-group">
<a href="/{back}" class="btn btn-default">Back</a>
</div>
</xsl:if>
</xsl:if>
</xsl:template>

<!--
//
//  Content template
//
//-->
<xsl:template match="content">
<xsl:apply-templates select="page" />
<xsl:apply-templates select="website_error" />
</xsl:template>

</xsl:stylesheet>
